import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Severity, PinType } from "@prisma/client";

export class CreatePinDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() issueId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  pageUrl!: string;

  @IsObject()
  anchor!: Record<string, unknown>;

  @IsNumber() offsetX!: number;
  @IsNumber() offsetY!: number;

  @IsString()
  @MaxLength(4000)
  comment!: string;

  @IsEnum(Severity)
  severity!: Severity;

  @IsEnum(PinType)
  issueType!: PinType;

  @IsOptional() @IsString() assigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];
}
