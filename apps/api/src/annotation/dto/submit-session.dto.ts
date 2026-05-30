import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SubmitSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;
}
