import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { WorkspaceModule } from "../workspace/workspace.module";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          // `expiresIn` accepts ms.StringValue (e.g. "30d", "1h") or number
          // seconds. Cast the generic ConfigService string to satisfy that
          // narrower type — the value is validated by the JWT library at use.
          expiresIn: (config.get<string>("JWT_EXPIRES_IN") ??
            "30d") as `${number}${"s" | "m" | "h" | "d"}`,
        },
      }),
    }),
    // Forward-ref breaks the cycle: WorkspaceModule already imports
    // AuthModule (for JwtAuthGuard); AuthService imports WorkspaceService to
    // auto-accept pending invites on signup.
    forwardRef(() => WorkspaceModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
