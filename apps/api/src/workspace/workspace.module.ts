import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { WorkspaceController } from "./workspace.controller";
import { MembersController } from "./members.controller";
import { InvitesController } from "./invites.controller";
import { InviteAcceptController } from "./invite-accept.controller";
import { WorkspaceService } from "./workspace.service";

/**
 * Workspace (org) domain: the workspace itself + its members + pending
 * invites. Imports AuthModule for the JwtAuthGuard and AuthService (the
 * switch endpoint re-mints tokens). forwardRef avoids a circular import
 * with AuthModule, which depends on WorkspaceService to auto-accept
 * pending invites on signup.
 */
@Module({
  imports: [forwardRef(() => AuthModule), MailModule],
  controllers: [
    WorkspaceController,
    MembersController,
    InvitesController,
    InviteAcceptController,
  ],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
