import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Status } from "@prisma/client";

/**
 * Patch surface for an issue. Each field is optional — clients send only the
 * fields they want to change. Status accepts the full enum (including
 * `archived` as the "soft-delete" flavour). Pin-level mutations remain
 * under /annotation/pins/:id.
 */
export class UpdateIssueDto {
  /**
   * Move the issue to another board (id) or unassign it (`null`). `undefined`
   * leaves the current assignment untouched.
   */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  boardId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  /**
   * Status transition. `archived` hides the issue from the default feed
   * (it's still queryable via ?status=archived or ?includeArchived=true).
   */
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
