/**
 * Product feedback — users telling the pinlay team something.
 *
 * Ordering matters here: the row is committed BEFORE the notification email is
 * attempted, and the email is fire-and-forget. Mail is best-effort in this
 * codebase (see MailService — a failed send only logs), so if the notification
 * were the only record, a Resend outage would silently swallow user feedback.
 * Persisting first means the worst case is "we didn't get pinged", not
 * "the report is gone".
 */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateFeedbackDto,
    userAgent?: string,
  ) {
    const row = await this.prisma.feedback.create({
      data: {
        kind: dto.kind ?? "other",
        message: dto.message.trim(),
        userId: user.id,
        email: user.email,
        name: user.name,
        workspaceId: user.workspaceId,
        path: dto.path?.slice(0, 500) ?? null,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
      select: { id: true, createdAt: true },
    });

    // Fire-and-forget: the user's submission already succeeded, so a mail
    // failure must not turn into a 500 on their screen.
    void this.mail
      .sendFeedbackNotification({
        kind: dto.kind ?? "other",
        message: dto.message.trim(),
        fromName: user.name,
        fromEmail: user.email,
        path: dto.path ?? null,
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Feedback ${row.id} saved but notification failed: ${
            (err as Error).message
          }`,
        );
      });

    return { id: row.id, createdAt: row.createdAt };
  }
}
