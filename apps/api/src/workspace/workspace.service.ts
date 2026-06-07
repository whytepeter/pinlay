import { randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { InviteStatus, Prisma, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { MailService } from "../mail/mail.service";
import { env } from "../config/env";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";

/**
 * Reserved subdomain-ish slugs that we never want a workspace to claim — they
 * collide with routes the dashboard owns, or are too generic to be a tenant.
 */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "dashboard",
  "docs",
  "help",
  "login",
  "logout",
  "settings",
  "signup",
  "status",
  "support",
  "www",
]);

const SLUG_MAX_ATTEMPTS = 10;

/**
 * Lower-case, hyphen-separated slug. Strips diacritics, collapses runs of
 * non-alphanumerics to a single hyphen, trims leading/trailing hyphens. The
 * length cap matches the DTO constraint so a 120-char name doesn't bypass it.
 */
function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** A workspace as the switcher / settings render it. */
export interface WorkspaceDto {
  id: string;
  slug: string;
  name: string;
  plan: string;
  /** The caller's role in this workspace. */
  role: Role;
  /** Member count — drives seat usage + the switcher subtitle. */
  memberCount: number;
}

export interface MemberDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
}

/** Pending workspace invite as the Members UI renders it. */
export interface InviteDto {
  id: string;
  email: string;
  role: Role;
  status: InviteStatus;
  /**
   * Opaque accept-by-link token. Returned to admins on the workspace's own
   * invite list so they can copy the accept URL while email is offline.
   * Public /invites/:token endpoints address the invite by THIS value.
   */
  token: string;
  invitedBy: { id: string; name: string };
  invitedAt: string;
  expiresAt: string;
}

/**
 * Public preview of an invite, served from GET /api/invites/:token. The
 * accept page shows this BEFORE the user authenticates so they know what
 * they're being asked to join. Includes a flag for whether a pinlay account
 * exists for the invited email so the UI can branch into sign-in vs
 * sign-up.
 */
export interface PublicInvitePreview {
  workspace: { id: string; slug: string; name: string };
  email: string;
  role: Role;
  invitedBy: { name: string };
  expiresAt: string;
  /** True if the invited email already has a pinlay account. */
  hasAccount: boolean;
}

/**
 * Discriminated union of an invite POST response. When the invitee already
 * has an account they're added directly (`kind: 'member'`); when they don't
 * yet, a pending Invite row is created (`kind: 'invite'`). Clients render
 * each variant differently in the Members list.
 */
export type InviteResult =
  | { kind: "member"; member: MemberDto }
  | { kind: "invite"; invite: InviteDto };

const INVITE_EXPIRY_DAYS = 7;
const INVITE_TOKEN_BYTES = 24;

export interface SwitchResult {
  token: string;
  workspace: WorkspaceDto;
}

/**
 * Roles that may administer a workspace (rename, change plan, manage members).
 * `member` / `viewer` can read but not mutate the org.
 */
const ADMIN_ROLES: Role[] = [Role.owner, Role.admin];

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}

  // ── Reads ──────────────────────────────────────────────────────────────
  /** Every workspace the user belongs to (for the switcher). */
  async listMine(user: AuthenticatedUser): Promise<WorkspaceDto[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: { include: { _count: { select: { members: true } } } } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => this.toWorkspaceDto(m.workspace, m.role));
  }

  /** The caller's active workspace (the one their token is bound to). */
  async current(user: AuthenticatedUser): Promise<WorkspaceDto> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    return this.toWorkspaceDto(membership.workspace, membership.role);
  }

  // ── Mutations ────────────────────────────────────────────────────────────
  /**
   * Create a workspace and make the caller its owner. Returns a fresh JWT
   * bound to the new workspace so the client can switch into it in the same
   * round-trip (same shape as `switch`).
   *
   * Atomicity: the workspace row + owner membership are created in a single
   * transaction so we never leak an orphaned workspace if the membership
   * insert fails.
   */
  async create(
    user: AuthenticatedUser,
    dto: CreateWorkspaceDto,
  ): Promise<SwitchResult> {
    const name = dto.name.trim();
    const slug = await this.resolveSlug(dto.slug, name);

    let created: { id: string; slug: string; name: string; plan: string };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const ws = await tx.workspace.create({
          data: { name, slug },
          select: { id: true, slug: true, name: true, plan: true },
        });
        await tx.workspaceMember.create({
          data: {
            workspaceId: ws.id,
            userId: user.id,
            role: Role.owner,
          },
        });
        return ws;
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // Race: the slug was free at resolve time but taken before insert.
        throw new ConflictException(
          `A workspace with slug "${slug}" already exists.`,
        );
      }
      throw err;
    }

    const token = await this.auth.signToken(
      { id: user.id, email: user.email },
      created.id,
    );
    return {
      token,
      workspace: this.toWorkspaceDto(
        { ...created, _count: { members: 1 } },
        Role.owner,
      ),
    };
  }

  async update(
    user: AuthenticatedUser,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceDto> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);

    const data: { name?: string; plan?: string; slug?: string } = {};
    if (typeof dto.name === "string") data.name = dto.name.trim();
    if (typeof dto.plan === "string") data.plan = dto.plan;
    if (typeof dto.slug === "string") {
      const slug = dto.slug.toLowerCase();
      if (RESERVED_SLUGS.has(slug)) {
        throw new ConflictException(
          `"${slug}" is reserved. Pick a different slug.`,
        );
      }
      const conflict = await this.prisma.workspace.findFirst({
        where: { slug, NOT: { id: user.workspaceId } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          `A workspace with slug "${slug}" already exists.`,
        );
      }
      data.slug = slug;
    }

    try {
      const workspace = await this.prisma.workspace.update({
        where: { id: user.workspaceId },
        data,
        include: { _count: { select: { members: true } } },
      });
      return this.toWorkspaceDto(workspace, membership.role);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // Race: slug was free during the pre-check but taken before update.
        throw new ConflictException(
          `That slug was just taken. Try a different one.`,
        );
      }
      throw err;
    }
  }

  /**
   * Switch the active workspace: verify the user belongs to the target, then
   * re-issue a JWT bound to it. The token is the source of truth for the active
   * workspace, so switching == minting a new token.
   */
  async switch(user: AuthenticatedUser, workspaceId: string): Promise<SwitchResult> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspaceId },
      include: { workspace: { include: { _count: { select: { members: true } } } } },
    });
    if (!membership) {
      // Don't distinguish "no such workspace" from "not a member" — both are
      // just "you can't switch there".
      throw new NotFoundException("Workspace not found.");
    }
    const token = await this.auth.signToken(
      { id: user.id, email: user.email },
      workspaceId,
    );
    return {
      token,
      workspace: this.toWorkspaceDto(membership.workspace, membership.role),
    };
  }

  /** Delete the active workspace (danger zone). Owner only. */
  async remove(user: AuthenticatedUser): Promise<void> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    if (membership.role !== Role.owner) {
      throw new ForbiddenException("Only the owner can delete a workspace.");
    }
    // Cascade deletes members, sessions, issues, pins (schema onDelete: Cascade).
    await this.prisma.workspace.delete({ where: { id: user.workspaceId } });
  }

  // ── Members ────────────────────────────────────────────────────────────
  async listMembers(user: AuthenticatedUser): Promise<MemberDto[]> {
    await this.requireMembership(user.workspaceId, user.id);
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: user.workspaceId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    return members.map((m) => this.toMemberDto(m));
  }

  /**
   * Invite a member.
   *
   * Two paths:
   *   1. Invitee already has a pinlay account → add as WorkspaceMember
   *      directly (`kind: 'member'`). Instant join.
   *   2. Invitee doesn't have an account yet → create a pending Invite row
   *      (`kind: 'invite'`) that AuthService converts to a real membership
   *      on signup with the same email.
   *
   * Admin only. Re-inviting an email that already has a pending invite
   * 409s (the UI should resend instead).
   */
  async inviteMember(
    user: AuthenticatedUser,
    dto: InviteMemberDto,
  ): Promise<InviteResult> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);

    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? Role.member;

    const invitee = await this.prisma.user.findUnique({ where: { email } });
    if (invitee) {
      const existing = await this.prisma.workspaceMember.findFirst({
        where: { workspaceId: user.workspaceId, userId: invitee.id },
      });
      if (existing) {
        throw new ConflictException("That person is already a member.");
      }
      const created = await this.prisma.workspaceMember.create({
        data: {
          workspaceId: user.workspaceId,
          userId: invitee.id,
          role,
        },
        include: { user: true },
      });
      return { kind: "member", member: this.toMemberDto(created) };
    }

    // Pending path — no account yet.
    const pending = await this.prisma.invite.findFirst({
      where: {
        workspaceId: user.workspaceId,
        email,
        status: InviteStatus.pending,
      },
    });
    if (pending) {
      throw new ConflictException(
        "An invite for that email is already pending. Resend or revoke it first.",
      );
    }

    const created = await this.prisma.invite.create({
      data: {
        workspaceId: user.workspaceId,
        email,
        role,
        invitedById: user.id,
        token: makeInviteToken(),
        expiresAt: new Date(
          Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
        workspace: { select: { name: true } },
      },
    });
    // Fire-and-forget invite email — failures are logged inside MailService
    // and never block the API response (admin still has Copy invite link).
    void this.mail.sendInvite({
      to: email,
      inviterName:
        created.invitedBy?.name ||
        created.invitedBy?.email ||
        "A teammate",
      workspaceName: created.workspace.name,
      inviteUrl: `${env().webAppUrl}/invite/${created.token}`,
    });
    return { kind: "invite", invite: this.toInviteDto(created) };
  }

  /** All non-finalised invites for the active workspace. */
  async listInvites(user: AuthenticatedUser): Promise<InviteDto[]> {
    await this.requireMembership(user.workspaceId, user.id);
    const invites = await this.prisma.invite.findMany({
      where: {
        workspaceId: user.workspaceId,
        status: InviteStatus.pending,
      },
      include: { invitedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return invites.map((i) => this.toInviteDto(i));
  }

  /** Revoke (delete) a pending invite. Admin only. */
  async revokeInvite(
    user: AuthenticatedUser,
    inviteId: string,
  ): Promise<void> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);
    const invite = await this.prisma.invite.findFirst({
      where: { id: inviteId, workspaceId: user.workspaceId },
      select: { id: true, status: true },
    });
    if (!invite) throw new NotFoundException("Invite not found.");
    if (invite.status !== InviteStatus.pending) {
      // Already accepted or revoked — idempotent OK.
      return;
    }
    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.revoked },
    });
  }

  /**
   * Resend an invite — regenerates the accept-token, resets the expiry, and
   * (eventually) re-fires the email. Returns the refreshed invite row.
   */
  async resendInvite(
    user: AuthenticatedUser,
    inviteId: string,
  ): Promise<InviteDto> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);
    const invite = await this.prisma.invite.findFirst({
      where: {
        id: inviteId,
        workspaceId: user.workspaceId,
        status: InviteStatus.pending,
      },
      select: { id: true },
    });
    if (!invite) {
      throw new NotFoundException("Pending invite not found.");
    }
    const refreshed = await this.prisma.invite.update({
      where: { id: inviteId },
      data: {
        token: makeInviteToken(),
        expiresAt: new Date(
          Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
        workspace: { select: { name: true } },
      },
    });
    // Re-fire the email with the regenerated token (the prior link is dead).
    void this.mail.sendInviteResent({
      to: refreshed.email,
      inviterName:
        refreshed.invitedBy?.name ||
        refreshed.invitedBy?.email ||
        "A teammate",
      workspaceName: refreshed.workspace.name,
      inviteUrl: `${env().webAppUrl}/invite/${refreshed.token}`,
    });
    return this.toInviteDto(refreshed);
  }

  /**
   * Called from AuthService.signup. Converts every PENDING invite for the
   * new user's email into a WorkspaceMember row + marks the invite accepted.
   * Idempotent — if there's already a membership row (race) we skip without
   * throwing.
   */
  async acceptPendingInvitesForEmail(
    userId: string,
    email: string,
  ): Promise<number> {
    const normalized = email.trim().toLowerCase();
    const pending = await this.prisma.invite.findMany({
      where: { email: normalized, status: InviteStatus.pending },
      select: { id: true, workspaceId: true, role: true },
    });
    if (pending.length === 0) return 0;

    await this.prisma.$transaction(async (tx) => {
      for (const inv of pending) {
        // Skip if the user is already a member (e.g. invite + manual add race).
        const existing = await tx.workspaceMember.findFirst({
          where: { workspaceId: inv.workspaceId, userId },
          select: { id: true },
        });
        if (!existing) {
          await tx.workspaceMember.create({
            data: {
              workspaceId: inv.workspaceId,
              userId,
              role: inv.role,
            },
          });
        }
        await tx.invite.update({
          where: { id: inv.id },
          data: { status: InviteStatus.accepted },
        });
      }
    });
    return pending.length;
  }

  // ── Public invite-by-token endpoints ───────────────────────────────────
  /**
   * Look up an invite by its accept token. PUBLIC (no auth) — the recipient
   * needs to see the invite preview before they sign in or create an
   * account. Errors are conservative:
   *   - not found     → 404 (token typo or never existed)
   *   - revoked       → 410 Gone (don't leak it ever was)
   *   - already accepted → 410 Gone
   *   - expired       → 410 Gone (also marks the row expired as a side effect
   *                     so the UI sees a stable state on refresh)
   */
  async lookupInvite(token: string): Promise<PublicInvitePreview> {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, slug: true, name: true } },
        invitedBy: { select: { name: true } },
      },
    });
    if (!invite) throw new NotFoundException("Invite not found.");
    if (invite.status === InviteStatus.revoked) {
      throw new ConflictException("This invite has been revoked.");
    }
    if (invite.status === InviteStatus.accepted) {
      throw new ConflictException("This invite has already been accepted.");
    }
    if (
      invite.status === InviteStatus.pending &&
      invite.expiresAt.getTime() < Date.now()
    ) {
      // Lazy-expire so a refresh sees the right terminal state.
      await this.prisma.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.expired },
      });
      throw new ConflictException("This invite has expired.");
    }
    if (invite.status === InviteStatus.expired) {
      throw new ConflictException("This invite has expired.");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });
    return {
      workspace: invite.workspace,
      email: invite.email,
      role: invite.role,
      invitedBy: { name: invite.invitedBy.name },
      expiresAt: invite.expiresAt.toISOString(),
      hasAccount: !!user,
    };
  }

  /**
   * Accept an invite as an authenticated user. The caller's email MUST
   * match the invite's email — we don't let one account claim invites
   * targeted at another address (would be a privilege-escalation vector if
   * an admin invites a typo'd email and the wrong user clicks the link).
   *
   * Returns a SwitchResult so the client can adopt the workspace in one
   * round-trip (token bound to the newly-joined workspace).
   */
  async acceptInviteByToken(
    user: AuthenticatedUser,
    token: string,
  ): Promise<SwitchResult> {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: {
        workspace: { include: { _count: { select: { members: true } } } },
      },
    });
    if (!invite || invite.status !== InviteStatus.pending) {
      throw new NotFoundException("Invite not found.");
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      await this.prisma.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.expired },
      });
      throw new ConflictException("This invite has expired.");
    }
    if (invite.email !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        "This invite is for a different email. Log out and try the link again.",
      );
    }

    const existing = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: invite.workspaceId, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role,
          },
        }),
        this.prisma.invite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.accepted },
        }),
      ]);
    } else {
      // Already a member (e.g. invited + manually added race) — still mark
      // the invite accepted so the admin's pending list clears.
      await this.prisma.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.accepted },
      });
    }

    const wsToken = await this.auth.signToken(
      { id: user.id, email: user.email },
      invite.workspaceId,
    );
    return {
      token: wsToken,
      workspace: this.toWorkspaceDto(invite.workspace, invite.role),
    };
  }

  /**
   * Accept an invite by signing up. PUBLIC — used by recipients who don't
   * have a pinlay account yet. The email is locked from the invite (we
   * never trust the body for that field). Creates User + WorkspaceMember +
   * marks invite accepted, all transactional. No personal workspace is
   * created — the user joins the invited workspace as their primary
   * (industry standard for signup-via-invite: Linear/Notion/etc.).
   *
   * Returns SwitchResult bound to the invited workspace so the client lands
   * directly inside it after signup.
   */
  async acceptInviteWithSignup(
    token: string,
    dto: { name: string; password: string },
  ): Promise<SwitchResult> {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: {
        workspace: { include: { _count: { select: { members: true } } } },
      },
    });
    if (!invite || invite.status !== InviteStatus.pending) {
      throw new NotFoundException("Invite not found.");
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      await this.prisma.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.expired },
      });
      throw new ConflictException("This invite has expired.");
    }

    const name = dto.name.trim();
    if (!name) {
      throw new ConflictException("Name is required.");
    }
    if (!dto.password || dto.password.length < 8) {
      throw new ConflictException("Password must be at least 8 characters.");
    }

    // The endpoint is open to anonymous callers — guard against a race where
    // the invitee has signed up directly in another tab between the page
    // load and the form submit.
    const existing = await this.prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        "An account with this email already exists. Sign in to accept.",
      );
    }

    // Hash outside the transaction (bcrypt is sync-blocking on the worker
    // thread; keep the DB lock window short).
    const passwordHash = await this.auth.hashPassword(dto.password);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: invite.email, name, passwordHash },
      });
      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
        },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.accepted },
      });
      return user;
    });

    const wsToken = await this.auth.signToken(
      { id: created.id, email: created.email },
      invite.workspaceId,
    );
    return {
      token: wsToken,
      workspace: this.toWorkspaceDto(invite.workspace, invite.role),
    };
  }

  async updateMember(
    user: AuthenticatedUser,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<MemberDto> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);

    const target = await this.requireMemberInWorkspace(user.workspaceId, memberId);
    // Guard the last owner: never let the only owner be demoted, or the
    // workspace becomes unadministrable.
    if (target.role === Role.owner && dto.role !== Role.owner) {
      await this.assertNotLastOwner(user.workspaceId);
    }
    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: true },
    });
    return this.toMemberDto(updated);
  }

  async removeMember(user: AuthenticatedUser, memberId: string): Promise<void> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);

    const target = await this.requireMemberInWorkspace(user.workspaceId, memberId);
    if (target.role === Role.owner) {
      await this.assertNotLastOwner(user.workspaceId);
    }
    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  /**
   * Either validate the caller-supplied slug or derive one from the name.
   * For derived slugs we append `-2`, `-3`, … until a free one is found.
   * Caller-supplied slugs that conflict throw ConflictException — we don't
   * silently rewrite what the user typed.
   */
  private async resolveSlug(
    requested: string | undefined,
    name: string,
  ): Promise<string> {
    if (requested) {
      const slug = requested.toLowerCase();
      if (RESERVED_SLUGS.has(slug)) {
        throw new ConflictException(
          `"${slug}" is reserved. Pick a different slug.`,
        );
      }
      const existing = await this.prisma.workspace.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `A workspace with slug "${slug}" already exists.`,
        );
      }
      return slug;
    }

    const base = slugify(name);
    if (!base) {
      throw new ConflictException(
        "Workspace name must contain letters or digits.",
      );
    }
    if (!RESERVED_SLUGS.has(base)) {
      const existing = await this.prisma.workspace.findUnique({
        where: { slug: base },
        select: { id: true },
      });
      if (!existing) return base;
    }
    for (let n = 2; n <= SLUG_MAX_ATTEMPTS; n++) {
      const candidate = `${base}-${n}`;
      if (RESERVED_SLUGS.has(candidate)) continue;
      const existing = await this.prisma.workspace.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    // Final fallback: random suffix. Collision-resistant for the bounded
    // retry window above.
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private async requireMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      include: { workspace: { include: { _count: { select: { members: true } } } } },
    });
    if (!membership) {
      throw new NotFoundException("Workspace not found.");
    }
    return membership;
  }

  private async requireMemberInWorkspace(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) {
      throw new NotFoundException("Member not found in this workspace.");
    }
    return member;
  }

  private async assertNotLastOwner(workspaceId: string): Promise<void> {
    const owners = await this.prisma.workspaceMember.count({
      where: { workspaceId, role: Role.owner },
    });
    if (owners <= 1) {
      throw new ForbiddenException(
        "A workspace must have at least one owner.",
      );
    }
  }

  private assertAdmin(role: Role): void {
    if (!ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException(
        "You don't have permission to manage this workspace.",
      );
    }
  }

  private toWorkspaceDto(
    workspace: {
      id: string;
      slug: string;
      name: string;
      plan: string;
      _count?: { members: number };
    },
    role: Role,
  ): WorkspaceDto {
    return {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      plan: workspace.plan,
      role,
      memberCount: workspace._count?.members ?? 0,
    };
  }

  private toMemberDto(m: {
    id: string;
    userId: string;
    role: Role;
    createdAt: Date;
    user: { name: string; email: string; avatarUrl: string | null };
  }): MemberDto {
    return {
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    };
  }

  private toInviteDto(i: {
    id: string;
    email: string;
    role: Role;
    status: InviteStatus;
    token: string;
    createdAt: Date;
    expiresAt: Date;
    invitedBy: { id: string; name: string };
  }): InviteDto {
    return {
      id: i.id,
      email: i.email,
      role: i.role,
      status: i.status,
      token: i.token,
      invitedBy: { id: i.invitedBy.id, name: i.invitedBy.name },
      invitedAt: i.createdAt.toISOString(),
      expiresAt: i.expiresAt.toISOString(),
    };
  }
}

/**
 * URL-safe random token for the future accept-by-link flow. Long enough
 * that even leaked tokens can't be brute-forced; uses base64url so the value
 * can be dropped straight into a query string.
 */
function makeInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}
