import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsString, MaxLength, MinLength } from "class-validator";
import { JwtAuthGuard, Public } from "../auth/jwt-auth.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/current-user.decorator";
import { WorkspaceService } from "./workspace.service";

/**
 * Body for POST /api/invites/:token/accept-with-signup. Email is intentionally
 * NOT accepted from the body — it's locked from the invite row so a caller
 * can't claim an invite for an email other than the one it was sent to.
 */
class AcceptInviteWithSignupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}

/**
 * Public-facing invite endpoints. Mounted at `/api/invites` (no workspace
 * prefix) because the caller hasn't joined a workspace yet — they only have
 * the opaque token from the invite link.
 *
 * GET is public; POST /accept needs auth; POST /accept-with-signup is public
 * (it BECOMES the auth — returns a JWT bound to the invited workspace).
 */
@Controller("invites")
@UseGuards(JwtAuthGuard)
export class InviteAcceptController {
  constructor(private readonly workspace: WorkspaceService) {}

  /**
   * Preview the invite. Used by the accept page so the recipient sees the
   * workspace + inviter BEFORE they sign in or sign up.
   *
   * Throttled aggressively because the endpoint takes a guessable URL slug
   * and reveals a workspace name — limit a brute-forcer to a small number
   * of attempts per minute per IP.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get(":token")
  lookup(@Param("token") token: string) {
    return this.workspace.lookupInvite(token);
  }

  /** Accept the invite as a logged-in user with matching email. */
  @Post(":token/accept")
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param("token") token: string,
  ) {
    return this.workspace.acceptInviteByToken(user, token);
  }

  /**
   * Combined signup + accept. Public — same tight throttle as login/signup
   * to stop credential stuffing.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post(":token/accept-with-signup")
  @HttpCode(HttpStatus.CREATED)
  acceptWithSignup(
    @Param("token") token: string,
    @Body() dto: AcceptInviteWithSignupDto,
  ) {
    return this.workspace.acceptInviteWithSignup(token, dto);
  }
}
