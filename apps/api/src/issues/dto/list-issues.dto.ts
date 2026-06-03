import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Severity, Status } from "@prisma/client";

/** Query params for GET /api/issues — all optional filters. */
export class ListIssuesDto {
  @IsOptional() @IsEnum(Status) status?: Status;

  /**
   * `"true"` to include `archived` issues in the result. Default omits them
   * so the feed shows live work. Has no effect when an explicit `status`
   * filter is set (the filter wins).
   */
  @IsOptional() @IsBooleanString() includeArchived?: string;

  /** Filter to issues containing at least one pin at this severity. */
  @IsOptional() @IsEnum(Severity) severity?: Severity;

  /** Filter to a single page URL (exact match). */
  @IsOptional() @IsString() pageUrl?: string;

  /** Free-text match against the issue title. */
  @IsOptional() @IsString() q?: string;

  /**
   * Filter by board. Pass a board id to scope to that board, or the literal
   * string `"null"` to surface only unassigned issues (issues with no board).
   * Omitted = no filter (issues with any board state are returned).
   */
  @IsOptional() @IsString() boardId?: string;

  /** Filter to issues authored by this user id (the issue "reporter"). */
  @IsOptional() @IsString() reporterId?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsInt() @Min(0) offset?: number;
}
