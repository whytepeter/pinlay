import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Severity, PinType, Status } from "@prisma/client";

/** Patch shape — everything optional. */
export class UpdatePinDto {
  @IsOptional() @IsString() @MaxLength(4000) comment?: string;
  @IsOptional() @IsEnum(Severity) severity?: Severity;
  @IsOptional() @IsEnum(PinType) issueType?: PinType;
  @IsOptional() @IsEnum(Status) status?: Status;
  @IsOptional() @IsString() assigneeId?: string | null;
  @IsOptional() @IsObject() anchor?: Record<string, unknown>;
  @IsOptional() @IsNumber() offsetX?: number;
  @IsOptional() @IsNumber() offsetY?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) labels?: string[];
}
