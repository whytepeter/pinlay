import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  workspaceId: string;
  role: string;
}

/**
 * @CurrentUser() param decorator — pulls the user attached by JwtAuthGuard
 * (either via verified JWT or DEV_USER_EMAIL fallback).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthenticatedUser;
  },
);
