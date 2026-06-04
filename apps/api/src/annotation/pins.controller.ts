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
  Query,
  UseGuards,
} from "@nestjs/common";
import { AnnotationService } from "./annotation.service";
import { CreatePinDto } from "./dto/create-pin.dto";
import { UpdatePinDto } from "./dto/update-pin.dto";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/current-user.decorator";

@Controller("annotation/pins")
@UseGuards(JwtAuthGuard)
export class PinsController {
  constructor(private readonly annotation: AnnotationService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePinDto) {
    return this.annotation.createPin(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("pageUrl") pageUrl: string,
    @Query("host") host: string,
  ) {
    return this.annotation.listPagePins(user, { pageUrl, host });
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePinDto,
  ) {
    return this.annotation.updatePin(user, id, dto);
  }

  @Delete(":id")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.annotation.deletePin(user, id);
    return { deleted: true };
  }

  // ── Pin comments ───────────────────────────────────────────────────────
  @Get(":id/comments")
  listComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.annotation.listComments(user, id);
  }

  @Post(":id/comments")
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.annotation.createComment(user, id, dto);
  }

  @Patch(":id/comments/:commentId")
  updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.annotation.updateComment(user, id, commentId, dto);
  }

  @Delete(":id/comments/:commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("commentId") commentId: string,
  ) {
    await this.annotation.deleteComment(user, id, commentId);
  }
}
