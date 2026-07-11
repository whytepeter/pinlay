import {
  BadRequestException,
  Body,
  Controller,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { AttachmentsService } from "./attachments.service";
import {
  CreateAttachmentDto,
  CreateUploadUrlDto,
  UploadAttachmentDto,
} from "./dto/create-attachment.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/current-user.decorator";
import { env } from "../config/env";

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

  /**
   * Single-shot upload for clients that can't PUT to R2 directly (browser
   * extension — R2 CORS won't allow `chrome-extension://*`). File rides in
   * a `file` multipart field; DTO fields ride alongside. Bytes stream
   * through Nest to R2 via `StorageService.uploadBuffer`.
   */
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadAttachmentDto,
  ) {
    if (!file) throw new BadRequestException("file field is required");
    if (file.size > env().storage.maxUploadBytes) {
      throw new PayloadTooLargeException(
        `file ${file.size}B exceeds max ${env().storage.maxUploadBytes}B`,
      );
    }
    return this.attachments.createFromBuffer(user, dto, file);
  }
}
