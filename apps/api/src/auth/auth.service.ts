import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { WorkspaceService } from "../workspace/workspace.service";

const BCRYPT_ROUNDS = 12;

export interface JwtPayload {
  sub: string; // userId
  email: string;
  wsId: string; // active workspace
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
  workspace: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    role: string;
  };
}

/** Shape returned by GET /auth/me and PATCH /auth/me. */
export interface Me {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgId: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => WorkspaceService))
    private readonly workspace: WorkspaceService,
  ) {}

  // ── Signup ───────────────────────────────────────────────────────────────
  async signup(dto: SignupDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with that email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const workspaceName = (dto.workspaceName ?? `${dto.name}'s workspace`).slice(0, 120);
    const slug = await this.uniqueWorkspaceSlug(workspaceName);

    // User + Workspace + Membership in one transaction so a half-finished
    // signup never leaves an orphan user with no workspace.
    const { user, workspace, role } = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: { email, name: dto.name, passwordHash },
        });
        const workspace = await tx.workspace.create({
          data: { slug, name: workspaceName, plan: "free" },
        });
        const membership = await tx.workspaceMember.create({
          data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
        });
        return { user, workspace, role: membership.role };
      },
    );

    // Convert any pending invites for this email into real memberships.
    // Best-effort: a failure here shouldn't take down the signup; the user
    // can still hit the workspace via the invite link later. Logged for
    // diagnostics.
    try {
      await this.workspace.acceptPendingInvitesForEmail(user.id, email);
    } catch (err) {
      this.logger.warn(
        `Failed to auto-accept pending invites for ${email}: ${String(err)}`,
      );
    }

    return this.makeAuthResult(user, workspace, role);
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Same generic error for missing user + bad password — never tell an
    // attacker which one is which.
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) {
      throw new UnauthorizedException(
        "Account has no workspace — contact support.",
      );
    }
    return this.makeAuthResult(user, membership.workspace, membership.role);
  }

  /**
   * Hash a plaintext password with the project's bcrypt rounds. Exposed so
   * other modules (e.g. WorkspaceService.acceptInviteWithSignup) can create
   * users without duplicating the hashing config or importing bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Patch the caller's profile. Mutable fields: `name`, `avatarUrl`. Email +
   * password changes have their own flows (verification / current-password
   * confirmation). Returns the full Me shape so the client can swap state
   * without a follow-up GET /auth/me.
   *
   * Defensive on empty patches: returns the current Me without writing if
   * there's nothing to change — avoids bumping `updatedAt` for a no-op.
   */
  async updateMe(user: AuthenticatedUser, dto: UpdateMeDto): Promise<Me> {
    const patch: { name?: string; avatarUrl?: string | null } = {};
    if (typeof dto.name === "string") {
      const trimmed = dto.name.trim();
      if (trimmed.length === 0) {
        throw new ConflictException("Name cannot be empty.");
      }
      patch.name = trimmed;
    }
    if (dto.avatarUrl !== undefined) {
      patch.avatarUrl = dto.avatarUrl;
    }

    let updated: {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
    };
    if (Object.keys(patch).length === 0) {
      const current = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });
      updated = current;
    } else {
      updated = await this.prisma.user.update({
        where: { id: user.id },
        data: patch,
        select: { id: true, email: true, name: true, avatarUrl: true },
      });
    }

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      orgId: user.workspaceId,
      role: user.role,
    };
  }

  // ── Token verification (used by JwtAuthGuard) ───────────────────────────
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
  }

  /**
   * Mint a JWT for a given user + active workspace. Used by signup/login here
   * and by the workspace switch endpoint (which re-issues a token bound to the
   * newly-selected workspace). The single place that builds a JwtPayload.
   */
  async signToken(user: { id: string; email: string }, workspaceId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      wsId: workspaceId,
    };
    return this.jwt.signAsync(payload);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private async uniqueWorkspaceSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "workspace";
    let slug = base;
    let n = 2;
    // Collisions are rare but cheap to retry.
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
      if (n > 50) {
        slug = `${base}-${Date.now().toString(36)}`;
        break;
      }
    }
    return slug;
  }

  private async makeAuthResult(
    user: { id: string; email: string; name: string; avatarUrl: string | null },
    workspace: { id: string; slug: string; name: string; plan: string },
    role: string,
  ): Promise<AuthResult> {
    const token = await this.signToken(user, workspace.id);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        plan: workspace.plan,
        role,
      },
    };
  }
}
