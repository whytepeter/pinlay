import {
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  /**
   * Auto-derived from name when omitted. Lowercase alphanumerics + hyphens,
   * 2–40 chars. Must be unique within the caller's workspace.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message:
      "slug must be lowercase letters, digits, and hyphens (no leading/trailing hyphen).",
  })
  slug?: string;

  /** Hex color (#RRGGBB or #RGB). Defaults to brand violet server-side. */
  @IsOptional()
  @IsHexColor()
  color?: string;

  /**
   * Optional explicit sort position. When omitted the server appends at the
   * end (max(position) + 1). Manual values let the client set initial order.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
