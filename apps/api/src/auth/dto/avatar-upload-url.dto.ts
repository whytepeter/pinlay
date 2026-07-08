import { IsIn, IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

/**
 * Ask for a presigned URL to upload the caller's avatar. Content-type is
 * restricted to common image formats so a client can't stash arbitrary
 * binaries under their user prefix.
 */
export class AvatarUploadUrlDto {
  @IsString()
  @IsIn(["image/png", "image/jpeg", "image/webp", "image/gif"])
  contentType!: string;

  @IsInt() @IsPositive() sizeBytes!: number;

  @IsOptional() @IsString() @MaxLength(255) filename?: string;
}
