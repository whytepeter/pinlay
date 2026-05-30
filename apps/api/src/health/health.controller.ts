import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const start = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      db: "ok",
      latencyMs: Date.now() - start,
      uptime: Math.round(process.uptime()),
      version: "0.0.0",
    };
  }
}
