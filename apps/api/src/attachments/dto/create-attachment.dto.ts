import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { AttachmentType } from "@prisma/client";

export class CreateAttachmentFileDto {
  @IsString() base64!: string;
  @IsString() @MaxLength(255) contentType!: string;
  @IsString() @MaxLength(255) filename!: string;
}

export class CreateAttachmentDto {
  @IsObject() file!: CreateAttachmentFileDto;
  @IsEnum(AttachmentType) type!: AttachmentType;
  @IsOptional() @IsString() pinId?: string;
  @IsOptional() @IsString() issueId?: string;
  @IsOptional() @IsString() sessionId?: string;
}
