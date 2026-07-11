/**
 * Two-step attachment flow:
 *
 *   1. POST /attachments/upload-url  →  presigned {uploadUrl, publicUrl, objectKey}
 *   2. client PUTs bytes to `uploadUrl`
 *   3. POST /attachments              →  persist row with the returned URL
 *
 * The API never sees the file bytes. Scoping (pin/issue must be in the
 * caller's workspace) happens at BOTH steps so a stolen presigned URL can't
 * be used to attach to a pin in another workspace.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService, type UploadKind } from "../storage/storage.service";
import {
  CreateAttachmentDto,
  CreateUploadUrlDto,
  UploadAttachmentDto,
} from "./dto/create-attachment.dto";
import { AuthenticatedUser } from "../common/current-user.decorator";

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createUploadUrl(user: AuthenticatedUser, dto: CreateUploadUrlDto) {
    await this.assertScope(user, dto.pinId, dto.issueId);
    return this.presign(user.workspaceId, "attachment", {
      contentType: dto.contentType,
      sizeBytes: dto.sizeBytes,
      filename: dto.filename,
    });
  }

  async create(user: AuthenticatedUser, dto: CreateAttachmentDto) {
    await this.assertScope(user, dto.pinId, dto.issueId);

    const att = await this.prisma.attachment.create({
      data: {
        pinId: dto.pinId ?? null,
        issueId: dto.issueId ?? null,
        type: dto.type,
        filename: dto.filename,
        contentType: dto.contentType,
        url: dto.url,
        sizeBytes: dto.sizeBytes,
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

  /**
   * Proxied upload (extension path). File bytes pass through Nest to R2 so
   * the client never touches R2 directly — needed because R2 CORS refuses
   * `chrome-extension://*` wildcards. The web app still uses the direct
   * presign+PUT flow above.
   */
  async createFromBuffer(
    user: AuthenticatedUser,
    dto: UploadAttachmentDto,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    await this.assertScope(user, dto.pinId, dto.issueId);

    let stored: { objectKey: string; publicUrl: string; sizeBytes: number };
    try {
      stored = await this.storage.uploadBuffer({
        kind: "attachment",
        scopeId: user.workspaceId,
        buffer: file.buffer,
        contentType: file.mimetype,
        filename: file.originalname,
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    const att = await this.prisma.attachment.create({
      data: {
        pinId: dto.pinId ?? null,
        issueId: dto.issueId ?? null,
        type: dto.type,
        filename: file.originalname,
        contentType: file.mimetype,
        url: stored.publicUrl,
        sizeBytes: stored.sizeBytes,
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

  /**
   * Presign helper shared with avatar / logo flows. `scopeId` is what gets
   * baked into the object key path so a workspace can't be tricked into
   * writing to another workspace's prefix.
   */
  async presign(
    scopeId: string,
    kind: UploadKind,
    args: { contentType: string; sizeBytes: number; filename?: string },
  ) {
    if (!args.contentType.trim()) {
      throw new BadRequestException("contentType is required");
    }
    try {
      return await this.storage.presign({
        kind,
        scopeId,
        contentType: args.contentType,
        sizeBytes: args.sizeBytes,
        filename: args.filename,
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  private async assertScope(
    user: AuthenticatedUser,
    pinId?: string,
    issueId?: string,
  ) {
    if (pinId) {
      const pin = await this.prisma.pin.findFirst({
        where: { id: pinId, session: { workspaceId: user.workspaceId } },
        select: { id: true },
      });
      if (!pin) throw new NotFoundException("Pin not found");
    }
    if (issueId) {
      const issue = await this.prisma.issue.findFirst({
        where: { id: issueId, workspaceId: user.workspaceId },
        select: { id: true },
      });
      if (!issue) throw new NotFoundException("Issue not found");
    }
  }
}
