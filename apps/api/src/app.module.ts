import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import { AnnotationModule } from "./annotation/annotation.module";
import { AttachmentsModule } from "./attachments/attachments.module";
import { IssuesModule } from "./issues/issues.module";
import { BoardsModule } from "./boards/boards.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    // Global rate limit — 100 requests / minute / IP across the whole API.
    // A tighter per-route limit is layered on the auth endpoints (see
    // AuthController @Throttle). Brute-force + scraping protection.
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    WorkspaceModule,
    AnnotationModule,
    AttachmentsModule,
    IssuesModule,
    BoardsModule,
    StorageModule,
  ],
  providers: [
    // Applies the throttler to every route by default.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
