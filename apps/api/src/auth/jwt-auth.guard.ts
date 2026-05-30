import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { env } from "../config/env";

/** Mark an endpoint as anonymous (no auth required). */
export const Public = () => SetMetadata("isPublic", true);

/**
 * Hybrid auth guard.
 *
 * 1. If the route is @Public(), pass through.
 * 2. If an `Authorization: Bearer <jwt>` header is present, verify it.
 * 3. Otherwise, ONLY in a non-production environment with ALLOW_DEV_AUTH=true
 *    AND DEV_USER_EMAIL set, resolve to that user (extension local mode +
 *    curl-driven dev). `env()` makes this impossible in production — the
 *    process refuses to start if ALLOW_DEV_AUTH is on in prod, and even if
 *    DEV_USER_EMAIL leaks into a prod env it is never consulted here.
 * 4. Otherwise reject.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const header = req.headers["authorization"] as string | undefined;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (bearer) {
      const payload = await this.auth.verifyToken(bearer);
      const membership = await this.prisma.workspaceMember.findFirst({
        where: { userId: payload.sub, workspaceId: payload.wsId },
        include: { user: true, workspace: true },
      });
      if (!membership) {
        throw new UnauthorizedException(
          "Token references a workspace you no longer belong to.",
        );
      }
      req.user = {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        avatarUrl: membership.user.avatarUrl,
        workspaceId: membership.workspace.id,
        role: membership.role,
      };
      return true;
    }

    // Dev-mode fallback (no token). Gated by env(): non-production +
    // ALLOW_DEV_AUTH=true + DEV_USER_EMAIL set. Production can never reach
    // this branch (env() throws at boot if ALLOW_DEV_AUTH is on in prod).
    const cfg = env();
    if (!cfg.devAuthEnabled || !cfg.devUserEmail) {
      throw new UnauthorizedException("Missing or invalid Authorization header.");
    }
    const devEmail = cfg.devUserEmail;
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { user: { email: devEmail } },
      include: { user: true, workspace: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) {
      this.logger.warn(
        `DEV_USER_EMAIL=${devEmail} has no workspace membership — run pnpm db:seed`,
      );
      throw new UnauthorizedException(
        `Dev user ${devEmail} has no workspace. Run \`pnpm db:seed\`.`,
      );
    }
    this.logger.debug(`Dev-auth fallback resolved request to ${devEmail}`);
    req.user = {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      avatarUrl: membership.user.avatarUrl,
      workspaceId: membership.workspace.id,
      role: membership.role,
    };
    return true;
  }
}
