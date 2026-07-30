import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

/** Mirrors the Prisma `FeedbackKind` enum. */
export const FEEDBACK_KINDS = ["bug", "idea", "question", "other"] as const;
export type FeedbackKindValue = (typeof FEEDBACK_KINDS)[number];

/**
 * In-app feedback about pinlay itself.
 *
 * `path` and `userAgent` are captured client-side rather than read from
 * headers: the Referer is unreliable on an SPA (it reports the entry URL, not
 * the route the user is actually looking at), and the whole point of the
 * context is knowing which screen they were on when they hit the problem.
 */
export class CreateFeedbackDto {
  @IsString()
  @Length(1, 5000)
  message!: string;

  @IsOptional()
  @IsIn(FEEDBACK_KINDS)
  kind?: FeedbackKindValue;

  /** Client route, e.g. "/p/abc123". Trimmed to keep rows bounded. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;
}
