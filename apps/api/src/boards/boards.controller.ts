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
import { BoardsService } from "./boards.service";
import { CreateBoardDto } from "./dto/create-board.dto";
import { UpdateBoardDto } from "./dto/update-board.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/current-user.decorator";

/**
 * Boards — workspace-scoped issue groupings. Reads are open to all members;
 * mutations require admin (owner/admin role) since renaming or deleting a
 * board changes the workspace's filing system.
 */
@Controller("boards")
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.boards.list(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boards.create(user, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boards.update(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.boards.remove(user, id);
  }
}
