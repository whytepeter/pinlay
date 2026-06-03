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
import { Throttle } from "@nestjs/throttler";
import { WorkspaceService } from "./workspace.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../common/current-user.decorator";

@Controller("workspaces")
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  /** Every workspace the caller belongs to — powers the switcher. */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspace.listMine(user);
  }

  /**
   * Create a new workspace. Caller becomes the owner. Returns a freshly minted
   * token bound to the new workspace (same shape as `:id/switch`) so the
   * client can replace its token and land inside the new space in one trip.
   *
   * Rate-limited to prevent workspace squatting / slug exhaustion.
   */
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspace.create(user, dto);
  }

  /** The caller's active workspace (the one their token is bound to). */
  @Get("current")
  current(@CurrentUser() user: AuthenticatedUser) {
    return this.workspace.current(user);
  }

  @Patch("current")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspace.update(user, dto);
  }

  /** Danger zone — owner only; cascades to all workspace data. */
  @Delete("current")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser) {
    await this.workspace.remove(user);
  }

  /**
   * Switch active workspace. Returns a NEW token bound to `:id`; the client
   * must replace its stored token with the returned one.
   */
  @Post(":id/switch")
  @HttpCode(HttpStatus.OK)
  switch(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.workspace.switch(user, id);
  }
}
