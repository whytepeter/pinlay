import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  // Two-tier model for now (mirrors the web BillingSection). Plan changes will
  // move behind the billing module once Stripe lands.
  @IsOptional()
  @IsIn(["free", "team"])
  plan?: string;
}
