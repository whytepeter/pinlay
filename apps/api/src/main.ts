import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import * as express from "express";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  // Validate the environment FIRST — a misconfigured prod deploy (weak JWT
  // secret, dev-auth enabled, missing CORS) throws here and the process never
  // starts insecure.
  const cfg = env();

  const app = await NestFactory.create(AppModule, {
    // Buffer logs so any startup errors surface in order.
    bufferLogs: true,
  });

  // Content-Security-Policy is disabled: this is a pure JSON API with no HTML
  // surface to protect. All other helmet defaults (HSTS, noSniff, frameguard,
  // etc.) stay on.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Explicit body-size limits. Sized for base64 screenshot attachments, but
  // bounded so a single request can't exhaust memory. Default 10mb.
  app.use(express.json({ limit: cfg.bodyLimit }));
  app.use(express.urlencoded({ limit: cfg.bodyLimit, extended: true }));

  // CORS — configured web origins + any chrome-extension:// origin (extension
  // IDs aren't stable enough to enumerate; the browser only sends requests
  // from the user's own installed copy). Requests with no Origin (curl,
  // server-to-server) are allowed in dev only — in production an explicit
  // Origin is required so the surface is browser-clients + the extension.
  type CorsCallback = (err: Error | null, allow?: boolean) => void;
  const isProd = cfg.nodeEnv === "production";
  app.enableCors({
    origin: (origin: string | undefined, cb: CorsCallback) => {
      if (!origin) return cb(null, !isProd);
      if (origin.startsWith("chrome-extension://")) return cb(null, true);
      if (cfg.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed`), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix("api");

  await app.listen(cfg.port);
  logger.log(`pinlay API listening on http://localhost:${cfg.port}/api`);
}

void bootstrap();
