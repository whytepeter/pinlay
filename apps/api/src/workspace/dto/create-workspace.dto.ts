import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * Create a new workspace. The caller becomes the owner; the response includes
 * a fresh JWT bound to the new workspace so the client can switch into it in
 * the same round-trip.
 */
export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  /**
   * URL-safe identifier. Optional — derived from `name` if omitted. When
   * provided, must be lowercase alphanumerics + hyphens (no leading/trailing
   * hyphen). Must be globally unique.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message:
      "slug must be lowercase letters, digits, and hyphens (no leading/trailing hyphen).",
  })
  slug?: string;
}
