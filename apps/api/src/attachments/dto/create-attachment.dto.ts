import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { AttachmentType } from "@prisma/client";

/**
 * Request a presigned upload URL. `contentType` + `sizeBytes` are baked into
 * the presign so a client can't get a URL, swap the file, and PUT something
 * larger or of a different type.
 */
export class CreateUploadUrlDto {
  @IsEnum(AttachmentType) type!: AttachmentType;
  @IsString() @MaxLength(255) contentType!: string;
  @IsInt() @IsPositive() sizeBytes!: number;
  @IsOptional() @IsString() @MaxLength(255) filename?: string;
  @IsOptional() @IsString() pinId?: string;
  @IsOptional() @IsString() issueId?: string;
}

/**
 * Confirm an upload — persists the row pointing at the storage URL. The
 * client provides the URL we returned from /upload-url; we DON'T re-verify
 * the file exists (the storage layer will 404 on read if it doesn't). This
 * keeps the confirm cheap.
 */
export class CreateAttachmentDto {
  @IsEnum(AttachmentType) type!: AttachmentType;
  @IsString() @MaxLength(1024) objectKey!: string;
  @IsString() @MaxLength(2048) url!: string;
  @IsString() @MaxLength(255) contentType!: string;
  @IsString() @MaxLength(255) filename!: string;
  @IsInt() @Min(0) sizeBytes!: number;
  @IsOptional() @IsString() pinId?: string;
  @IsOptional() @IsString() issueId?: string;
}

/**
 * Server-side proxied upload. Used by the browser extension, which can't PUT
 * to R2 directly (R2 CORS doesn't accept `chrome-extension://*` origins).
 * The file rides as a multipart field; the rest are text fields on the same
 * FormData.
 *
 * The multer file itself is validated on the controller (size + presence).
 * class-validator with `enableImplicitConversion` coerces the type field
 * from the multipart form value.
 */
export class UploadAttachmentDto {
  @IsEnum(AttachmentType) type!: AttachmentType;
  @IsOptional() @IsString() pinId?: string;
  @IsOptional() @IsString() issueId?: string;
}
