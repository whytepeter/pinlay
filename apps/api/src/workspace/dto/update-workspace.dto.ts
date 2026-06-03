import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  /**
   * Workspace URL slug. Lowercase alphanumerics + hyphens, 2–60 chars,
   * globally unique. Same rules as create-workspace.
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

  // Two-tier model for now (mirrors the web BillingSection). Plan changes will
  // move behind the billing module once Stripe lands.
  @IsOptional()
  @IsIn(["free", "team"])
  plan?: string;
}
