import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class SignupDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** Plain-text password; hashed before storage. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  /** Optional workspace name; defaults to "<name>'s workspace". */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  workspaceName?: string;
}
