import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../common/current-user.decorator";

/** Members of the caller's ACTIVE workspace. Scoped to it implicitly via the
 *  token — no workspace id in the path so the surface can't address others. */
@Controller("workspaces/members")
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly workspace: WorkspaceService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspace.listMembers(user);
  }

  @Post("invite")
  @HttpCode(HttpStatus.CREATED)
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspace.inviteMember(user, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.workspace.updateMember(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.workspace.removeMember(user, id);
  }
}
