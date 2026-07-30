import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FeedbackService } from "./feedback.service";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/current-user.decorator";

/**
 * Feedback about pinlay itself. Write-only by design — there is deliberately
 * no GET: these are messages to the pinlay team, not workspace content, so no
 * member should be able to read another user's submissions through the API.
 * Read them from the database (or the notification email) instead.
 */
@Controller("feedback")
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  // Tighter than the global limit: a feedback form is an obvious vector for
  // spamming the team's inbox, and nobody legitimately files 5+ reports a minute.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeedbackDto,
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.feedback.create(user, dto, userAgent);
  }
}
