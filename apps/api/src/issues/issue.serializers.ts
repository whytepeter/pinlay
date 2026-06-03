import { Attachment, Board, Issue, Pin, User } from "@prisma/client";

/**
 * Issue read DTOs — the dashboard's primary unit. An **Issue** is the titled
 * collection of pins produced when an annotation review is submitted (the
 * capture-time grouping is the `Session` model; the Issue is what teams triage).
 *
 * Principles:
 *   • No presentation in the payload. Things derivable from `pageUrl`
 *     (favicon label/hue, url path) are the client's job, not the API's.
 *   • One vocabulary. `workspaceId` everywhere (never the mock's "orgId").
 *   • Identifiers, not formatted strings. `number` is raw; `reference`
 *     ("PL-0142") is the canonical human id the API owns the format of
 *     (mirrors Linear's number/identifier).
 *   • Embed relations the consumer always needs. `reporter`/`author`/
 *     `assignee` are compact member objects so the client never has to join
 *     against a separate members list. Detail embeds pins (+ their
 *     attachments) so the issue page is one round-trip, not a waterfall.
 *   • Keep the canonical field. A pin's `comment` is the source of truth;
 *     `title` is a derived convenience, never a replacement.
 */

export interface MemberRef {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * Compact board reference embedded in an issue payload. Only the fields the
 * card / detail header need — id+name to label, color to paint the dot. The
 * full Board DTO lives at /api/boards.
 */
export interface BoardRef {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface StatusCounts {
  open: number;
  in_progress: number;
  resolved: number;
}

/** List row — counts + summary, no embedded pins. */
export interface IssueSummaryDto {
  id: string;
  number: number;
  reference: string;
  workspaceId: string;
  title: string;
  summary: string | null;
  pageUrl: string;
  status: Issue["status"];
  reporter: MemberRef | null;
  board: BoardRef | null;
  pinCount: number;
  severityCounts: SeverityCounts;
  statusCounts: StatusCounts;
  createdAt: string;
  updatedAt: string;
}

/** Detail — summary + embedded pins (each with attachments). */
export interface IssueDetailDto extends IssueSummaryDto {
  pins: PinDto[];
}

export interface AttachmentDto {
  id: string;
  url: string;
  type: Attachment["type"];
  filename: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

export interface PinDto {
  id: string;
  issueId: string | null;
  index: number;
  /** Canonical markdown body as authored. */
  comment: string;
  /** Derived convenience: first non-empty line. Never replaces `comment`. */
  title: string;
  severity: Pin["severity"];
  type: Pin["issueType"];
  status: Pin["status"];
  author: MemberRef | null;
  assignee: MemberRef | null;
  anchor: Record<string, unknown>;
  offsetX: number;
  offsetY: number;
  labels: string[];
  stale: boolean;
  attachments: AttachmentDto[];
  createdAt: string;
  updatedAt: string;
}

// ── helpers ─────────────────────────────────────────────────────────────────

export function reference(seq: number): string {
  return `PL-${String(seq).padStart(4, "0")}`;
}

export function memberRef(user: User | null | undefined): MemberRef | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function boardRef(board: Board | null | undefined): BoardRef | null {
  if (!board) return null;
  return {
    id: board.id,
    name: board.name,
    slug: board.slug,
    color: board.color,
  };
}

/** First non-empty line of the comment, for a list/heading convenience. */
export function deriveTitle(comment: string): string {
  const text = comment ?? "";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}

export function severityCounts(
  pins: Pick<Pin, "severity">[],
): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const p of pins) counts[p.severity] += 1;
  return counts;
}

export function statusCounts(pins: Pick<Pin, "status">[]): StatusCounts {
  const counts: StatusCounts = { open: 0, in_progress: 0, resolved: 0 };
  for (const p of pins) {
    if (p.status === "open") counts.open += 1;
    else if (p.status === "in_progress") counts.in_progress += 1;
    else if (p.status === "resolved") counts.resolved += 1;
  }
  return counts;
}

// ── serializers ───────────────────────────────────────────────────────────

type IssueForSummary = Issue & {
  author?: User | null;
  board?: Board | null;
  pins: Pick<Pin, "severity" | "status">[];
};

export function toIssueSummary(issue: IssueForSummary): IssueSummaryDto {
  return {
    id: issue.id,
    number: issue.seq,
    reference: reference(issue.seq),
    workspaceId: issue.workspaceId,
    title: issue.title,
    summary: issue.summary,
    pageUrl: issue.pageUrl,
    status: issue.status,
    reporter: memberRef(issue.author),
    board: boardRef(issue.board),
    pinCount: issue.pins.length,
    severityCounts: severityCounts(issue.pins),
    statusCounts: statusCounts(issue.pins),
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export type PinWithRelations = Pin & {
  author?: User | null;
  assignee?: User | null;
  attachments?: Attachment[];
};

export function toAttachmentDto(a: Attachment): AttachmentDto {
  return {
    id: a.id,
    url: a.url,
    type: a.type,
    filename: a.filename,
    contentType: a.contentType,
    sizeBytes: a.sizeBytes,
    width: a.width ?? null,
    height: a.height ?? null,
  };
}

export function toPinDto(pin: PinWithRelations): PinDto {
  return {
    id: pin.id,
    issueId: pin.issueId ?? null,
    index: pin.index,
    comment: pin.comment,
    title: deriveTitle(pin.comment),
    severity: pin.severity,
    type: pin.issueType,
    status: pin.status,
    author: memberRef(pin.author),
    assignee: memberRef(pin.assignee),
    anchor: pin.anchor as Record<string, unknown>,
    offsetX: pin.offsetX,
    offsetY: pin.offsetY,
    labels: pin.labels,
    stale: false,
    attachments: (pin.attachments ?? []).map(toAttachmentDto),
    createdAt: pin.createdAt.toISOString(),
    updatedAt: pin.updatedAt.toISOString(),
  };
}

export function toIssueDetail(
  issue: IssueForSummary,
  pins: PinWithRelations[],
): IssueDetailDto {
  return {
    ...toIssueSummary(issue),
    pins: pins.map(toPinDto),
  };
}
