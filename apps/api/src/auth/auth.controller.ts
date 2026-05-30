import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, Public } from "./jwt-auth.guard";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../common/current-user.decorator";

@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
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
