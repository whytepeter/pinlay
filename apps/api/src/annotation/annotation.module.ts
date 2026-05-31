import { Module } from "@nestjs/common";
import { AnnotationService } from "./annotation.service";
import { PinsController } from "./pins.controller";
import { AnnotationSessionsController } from "./sessions.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [PinsController, AnnotationSessionsController],
  providers: [AnnotationService],
})
export class AnnotationModule {}
