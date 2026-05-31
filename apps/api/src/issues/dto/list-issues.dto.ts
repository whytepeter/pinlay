import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Status } from "@prisma/client";

/** Query params for GET /api/issues — all optional filters. */
export class ListIssuesDto {
  @IsOptional() @IsEnum(Status) status?: Status;

  /** Filter to a single page URL (exact match). */
  @IsOptional() @IsString() pageUrl?: string;

  /** Free-text match against the issue title. */
  @IsOptional() @IsString() q?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsInt() @Min(0) offset?: number;
}
