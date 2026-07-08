import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AttachmentsService } from "./attachments.service";
import {
  CreateAttachmentDto,
  CreateUploadUrlDto,
} from "./dto/create-attachment.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/current-user.decorator";

@Controller("attachments")
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  /** Step 1: get a presigned PUT URL. */
  @Post("upload-url")
  createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.attachments.createUploadUrl(user, dto);
  }

  /** Step 2 (after PUT): persist the row. */
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.attachments.create(user, dto);
  }
}
