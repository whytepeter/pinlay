import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

/**
 * Patch the caller's profile. Email is intentionally NOT mutable — changing
 * it needs a verification flow (TODO: add when transactional mail ships).
 * Password changes go through a future POST /auth/password endpoint so they
 * can require the current password.
 */
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  /**
   * `null` clears the avatar; a string must be an https URL — the R2 public
   * URL (r2.dev subdomain or a custom domain) always is.
   */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUrl({ require_protocol: true, protocols: ["https"] })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
