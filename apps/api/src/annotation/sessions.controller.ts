import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { AnnotationService } from "./annotation.service";
import { SubmitSessionDto } from "./dto/submit-session.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/current-user.decorator";

/**
 * Write half of the session lifecycle: finishing/submitting a capture sitting
 * (the extension calls this on "Done"). Read endpoints live in the resource
 * module at /api/sessions (SessionsController). Named "Annotation…" to keep it
 * distinct from that read controller.
 */
@Controller("annotation/sessions")
@UseGuards(JwtAuthGuard)
export class AnnotationSessionsController {
  constructor(private readonly annotation: AnnotationService) {}

  @Post(":id/submit")
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SubmitSessionDto,
  ) {
    return this.annotation.submitSession(user, id, dto);
  }
}
