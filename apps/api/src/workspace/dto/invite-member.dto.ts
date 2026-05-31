import { IsEmail, IsEnum, IsOptional, MaxLength } from "class-validator";
import { Role } from "@prisma/client";

export class InviteMemberDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // Owner is never assignable via invite — it's transferred, not granted.
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
