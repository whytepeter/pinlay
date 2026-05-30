import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";
import { AuthenticatedUser } from "../common/current-user.decorator";

/**
 * v1: inline storage. We persist the data URL on the row itself so the
 * extension can attach screenshots without S3/R2 plumbing. Upgrade path:
 * swap `inlineUrl` for a signed `objectKey` once apps/storage lands.
 */
@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateAttachmentDto) {
    if (dto.pinId) {
      const pin = await this.prisma.pin.findFirst({
        where: { id: dto.pinId, session: { workspaceId: user.workspaceId } },
      });
      if (!pin) throw new NotFoundException("Pin not found");
    }
    if (dto.issueId) {
      const issue = await this.prisma.issue.findFirst({
        where: { id: dto.issueId, workspaceId: user.workspaceId },
      });
      if (!issue) throw new NotFoundException("Issue not found");
    }

    const sizeBytes = Math.floor((dto.file.base64.length * 3) / 4);
    const inlineUrl = `data:${dto.file.contentType};base64,${dto.file.base64}`;

    const att = await this.prisma.attachment.create({
      data: {
        pinId: dto.pinId ?? null,
        issueId: dto.issueId ?? null,
        type: dto.type,
        filename: dto.file.filename,
        contentType: dto.file.contentType,
        url: inlineUrl,
        sizeBytes,
      },
    });

    return {
      id: att.id,
      url: att.url,
      type: att.type,
      filename: att.filename,
      contentType: att.contentType,
      sizeBytes: att.sizeBytes,
    };
  }
}
