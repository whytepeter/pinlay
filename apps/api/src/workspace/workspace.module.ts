import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkspaceController } from "./workspace.controller";
import { MembersController } from "./members.controller";
import { WorkspaceService } from "./workspace.service";

/**
 * Workspace (org) domain: the workspace itself + its members. Imports AuthModule
 * for the JwtAuthGuard and AuthService (the switch endpoint re-mints tokens).
 */
@Module({
  imports: [AuthModule],
  controllers: [WorkspaceController, MembersController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
