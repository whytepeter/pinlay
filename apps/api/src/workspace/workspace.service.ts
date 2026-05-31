import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";

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
    private readonly auth: AuthService,
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
  async update(
    user: AuthenticatedUser,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceDto> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);

    const workspace = await this.prisma.workspace.update({
      where: { id: user.workspaceId },
      data: {
        name: dto.name ?? undefined,
        // plan changes will route through billing once Stripe lands; allowed
        // here for now so the settings form is functional.
        plan: dto.plan ?? undefined,
      },
      include: { _count: { select: { members: true } } },
    });
    return this.toWorkspaceDto(workspace, membership.role);
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
   * Invite a member. v1: the user must already have an account (no pending-
   * invite email flow yet — that needs an Invite table + mailer). If they
   * exist and aren't already a member, add them; otherwise 404 so the UI can
   * prompt. Admin only.
   */
  async inviteMember(
    user: AuthenticatedUser,
    dto: InviteMemberDto,
  ): Promise<MemberDto> {
    const membership = await this.requireMembership(user.workspaceId, user.id);
    this.assertAdmin(membership.role);

    const email = dto.email.trim().toLowerCase();
    const invitee = await this.prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      throw new NotFoundException(
        "No pinlay account with that email yet. Email invites are coming soon.",
      );
    }
    const existing = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId: user.workspaceId, userId: invitee.id },
    });
    if (existing) {
      throw new ForbiddenException("That person is already a member.");
    }
    const created = await this.prisma.workspaceMember.create({
      data: {
        workspaceId: user.workspaceId,
        userId: invitee.id,
        role: dto.role ?? Role.member,
      },
      include: { user: true },
    });
    return this.toMemberDto(created);
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
}
