import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";

/**
 * Product feedback: users reporting bugs / ideas about pinlay itself.
 * Write-only surface — nothing else in the app consumes FeedbackService, so
 * it isn't exported.
 */
@Module({
  imports: [AuthModule, MailModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
