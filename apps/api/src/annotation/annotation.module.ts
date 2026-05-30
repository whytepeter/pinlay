import { Module } from "@nestjs/common";
import { AnnotationService } from "./annotation.service";
import { PinsController } from "./pins.controller";
import { SessionsController } from "./sessions.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [PinsController, SessionsController],
  providers: [AnnotationService],
})
export class AnnotationModule {}
