import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

/** Mark an endpoint as anonymous (no auth required). */
export const Public = () => SetMetadata("isPublic", true);

/**
 * JWT auth guard.
 *
 * 1. If the route is @Public(), pass through.
 * 2. Require an `Authorization: Bearer <jwt>` header and verify it; the token's
 *    workspace membership must still exist.
 * 3. Otherwise reject. There is no anonymous/dev fallback — every protected
 *    route needs a real token issued by /auth/login or /auth/signup.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
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

    if (!bearer) {
      throw new UnauthorizedException("Missing or invalid Authorization header.");
    }

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
}
