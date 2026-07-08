import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, Public } from "./jwt-auth.guard";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { AvatarUploadUrlDto } from "./dto/avatar-upload-url.dto";
import { StorageService } from "../storage/storage.service";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../common/current-user.decorator";
import { BadRequestException } from "@nestjs/common";

@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Tight per-route throttle: 5 attempts / minute / IP. Stops password
  // brute-force + credential stuffing. Layered on top of the global 100/min.
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Mirrors the extension's `Me` shape (apps/extension/src/lib/api.ts). */
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      orgId: user.workspaceId,
      role: user.role,
    };
  }

  /**
   * Update the caller's profile (name, avatarUrl). Email + password live on
   * their own endpoints (TODO) — those need verification / current-password
   * confirmation, which a generic PATCH shouldn't tunnel.
   */
  @Patch("me")
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto,
  ) {
    return this.auth.updateMe(user, dto);
  }

  /**
   * Presign an avatar upload. Web/extension flow: hit this → PUT blob to the
   * returned uploadUrl → PATCH /auth/me with {avatarUrl: publicUrl}. Scope is
   * the caller's user id so a workspace admin can't overwrite another user's
   * avatar path.
   */
  @Post("me/avatar-upload-url")
  async avatarUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AvatarUploadUrlDto,
  ) {
    try {
      return await this.storage.presign({
        kind: "avatar",
        scopeId: user.id,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        filename: dto.filename,
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  /**
   * @deprecated Members moved to `GET /workspaces/members` (workspace module).
   * Kept as a thin alias so the shipped extension build keeps working until it
   * adopts the new path. Remove once the extension is updated + reloaded.
   */
  @Get("workspace/members")
  async members(@CurrentUser() user: AuthenticatedUser) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId: user.workspaceId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    }));
  }
}
