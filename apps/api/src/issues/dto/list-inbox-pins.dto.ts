import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * Query params for GET /api/pins — the inbox feed.
 *
 * `state` carries inbox semantics, not the raw Status enum:
 *   • `open`     → pins with status open OR in_progress (work to look at)
 *   • `resolved` → resolved pins
 *   • `all`      → no status filter (still excludes archived)
 * Default is `open` — the inbox shows work first.
 */
export class ListInboxPinsDto {
  @IsOptional() @IsIn(["open", "resolved", "all"]) state?:
    | "open"
    | "resolved"
    | "all";

  /** Filter by site host (matched against the pin's pageUrl). */
  @IsOptional() @IsString() site?: string;

  /** Free-text match against the pin comment. */
  @IsOptional() @IsString() q?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsInt() @Min(0) offset?: number;
}
