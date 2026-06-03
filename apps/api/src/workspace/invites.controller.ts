import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/current-user.decorator";

/**
 * Pending workspace invites — sit alongside members so the Settings page can
 * render an "Invitees" section. Scoped to the caller's active workspace via
 * the JWT.
 *
 * Creating an invite still goes through POST /workspaces/members/invite —
 * the invite endpoint returns either a member or an invite depending on
 * whether the invitee already has an account.
 */
@Controller("workspaces/invites")
@UseGuards(JwtAuthGuard)
export class InvitesController {
  constructor(private readonly workspace: WorkspaceService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspace.listInvites(user);
  }

  /** Regenerate the accept token + extend expiry. Admin only. */
  @Post(":id/resend")
  @HttpCode(HttpStatus.OK)
  resend(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.workspace.resendInvite(user, id);
  }

  /** Mark the invite revoked. Idempotent. Admin only. */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.workspace.revokeInvite(user, id);
  }
}
