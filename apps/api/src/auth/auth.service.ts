import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";

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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

  // ── Token verification (used by JwtAuthGuard) ───────────────────────────
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
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
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      wsId: workspace.id,
    };
    const token = await this.jwt.signAsync(payload);
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
