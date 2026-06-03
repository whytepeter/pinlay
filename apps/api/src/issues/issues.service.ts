import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { BoardsService } from "../boards/boards.service";
import { ListIssuesDto } from "./dto/list-issues.dto";
import { UpdateIssueDto } from "./dto/update-issue.dto";
import {
  IssueDetailDto,
  IssueSummaryDto,
  PinDto,
  toIssueDetail,
  toIssueSummary,
  toPinDto,
} from "./issue.serializers";

export interface PaginatedIssues {
  items: IssueSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}

// Pin query shape reused by detail + pins endpoints — embeds author, assignee
// and attachments so the client never has to join against a members list.
const PIN_INCLUDE = {
  author: true,
  assignee: true,
  attachments: true,
} satisfies Prisma.PinInclude;

// Include shape for issue list/detail rows — author + board are embedded so
// cards/header render in one trip without extra joins.
const ISSUE_SUMMARY_INCLUDE = {
  author: true,
  board: true,
  pins: { select: { severity: true, status: true } },
} satisfies Prisma.IssueInclude;

/**
 * Issue read model — the dashboard's primary unit. An Issue is the titled
 * collection of pins produced when a review is submitted. Everything here is
 * workspace-scoped via `user.workspaceId` — cross-tenant ids never resolve.
 */
@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ListIssuesDto,
  ): Promise<PaginatedIssues> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const where = this.buildWhere(user, query);

    const [issues, total] = await this.prisma.$transaction([
      this.prisma.issue.findMany({
        where,
        include: ISSUE_SUMMARY_INCLUDE,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.issue.count({ where }),
    ]);

    return { items: issues.map(toIssueSummary), total, limit, offset };
  }

  /**
   * Returns the issue count per status (plus "all") for the given filters.
   * Drives the status tabs in the dashboard's filter bar so the count next
   * to each tab is accurate even when a non-status filter is active.
   *
   * Implementation: one COUNT(*) per status + an unfiltered baseline, all
   * in a single `groupBy + count` round-trip. Cheaper than four separate
   * queries and stays accurate without pagination math.
   */
  async counts(
    user: AuthenticatedUser,
    query: Omit<ListIssuesDto, "status" | "limit" | "offset">,
  ): Promise<{
    all: number;
    open: number;
    in_progress: number;
    resolved: number;
    archived: number;
  }> {
    // For counts we always want the FULL per-status breakdown — `all` shows
    // live (non-archived) totals, while `archived` is its own count. Force
    // includeArchived=true so the buildWhere clause doesn't drop them.
    const where = this.buildWhere(user, {
      ...query,
      includeArchived: "true",
    });
    const grouped = await this.prisma.issue.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });
    const totals = {
      all: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      archived: 0,
    };
    for (const row of grouped) {
      const n = row._count._all;
      if (row.status === "open") totals.open = n;
      else if (row.status === "in_progress") totals.in_progress = n;
      else if (row.status === "resolved") totals.resolved = n;
      else if (row.status === "archived") totals.archived = n;
      // `all` represents live work — excludes archived. Draft is not
      // surfaced as a tab today but still counts as live.
      if (row.status !== "archived") totals.all += n;
    }
    return totals;
  }

  /**
   * Compose the Prisma where-clause from the query DTO. Shared between list
   * + counts so the two stay in lockstep.
   */
  private buildWhere(
    user: AuthenticatedUser,
    query: Partial<ListIssuesDto>,
  ): Prisma.IssueWhereInput {
    // Hide archived by default. Explicit `status` filter (including
    // `status=archived`) wins; otherwise honour `includeArchived=true` to
    // surface archived alongside live issues.
    const archiveClause: Prisma.IssueWhereInput = query.status
      ? {}
      : query.includeArchived === "true"
        ? {}
        : { status: { not: "archived" } };

    return {
      workspaceId: user.workspaceId,
      ...archiveClause,
      ...(query.status ? { status: query.status } : {}),
      ...(query.pageUrl ? { pageUrl: query.pageUrl } : {}),
      ...(query.q
        ? { title: { contains: query.q, mode: "insensitive" } }
        : {}),
      ...(query.reporterId ? { authorId: query.reporterId } : {}),
      ...(query.severity
        ? { pins: { some: { severity: query.severity } } }
        : {}),
      ...boardFilter(query.boardId),
    };
  }

  async get(user: AuthenticatedUser, id: string): Promise<IssueDetailDto> {
    const issue = await this.prisma.issue.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: {
        author: true,
        board: true,
        pins: {
          include: PIN_INCLUDE,
          orderBy: { index: "asc" },
        },
      },
    });
    if (!issue) throw new NotFoundException("Issue not found");
    // `issue.pins` here carries the full relations; the summary serializer
    // only reads severity/status off them, so passing the richer rows is fine.
    return toIssueDetail(issue, issue.pins);
  }

  async listPins(user: AuthenticatedUser, id: string): Promise<PinDto[]> {
    // Confirm the issue is in this workspace before returning its pins.
    const issue = await this.prisma.issue.findFirst({
      where: { id, workspaceId: user.workspaceId },
      select: { id: true },
    });
    if (!issue) throw new NotFoundException("Issue not found");

    const pins = await this.prisma.pin.findMany({
      where: { issueId: id },
      include: PIN_INCLUDE,
      orderBy: { index: "asc" },
    });
    return pins.map(toPinDto);
  }

  /**
   * Patch an issue. v1 surfaces only board assignment — title/status/etc.
   * land on this same endpoint when those mutations are wired. Returns the
   * full updated summary so the client can swap state without a follow-up
   * GET.
   */
  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateIssueDto,
  ): Promise<IssueSummaryDto> {
    // Confirm the issue exists in this workspace first — keeps the error
    // surface consistent (404 instead of leaking a permission-shaped
    // response).
    const existing = await this.prisma.issue.findFirst({
      where: { id, workspaceId: user.workspaceId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Issue not found");

    const data: Prisma.IssueUpdateInput = {};
    if (dto.boardId !== undefined) {
      if (dto.boardId === null) {
        data.board = { disconnect: true };
      } else {
        // Cross-tenant guard: the board must live in the same workspace.
        await this.boards.assertBoardInWorkspace(user.workspaceId, dto.boardId);
        data.board = { connect: { id: dto.boardId } };
      }
    }
    if (typeof dto.title === "string") {
      data.title = dto.title.trim();
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (Object.keys(data).length === 0) {
      // No-op patch — return the current state without bumping updatedAt.
      const current = await this.prisma.issue.findUniqueOrThrow({
        where: { id },
        include: ISSUE_SUMMARY_INCLUDE,
      });
      return toIssueSummary(current);
    }

    const updated = await this.prisma.issue.update({
      where: { id },
      data,
      include: ISSUE_SUMMARY_INCLUDE,
    });
    return toIssueSummary(updated);
  }
}

/**
 * Translate the `boardId` query param into a Prisma where-fragment.
 *
 *   undefined    → no filter
 *   "null"       → board IS NULL (unassigned only)
 *   "<cuid>"     → exact match on that board
 */
function boardFilter(boardId: string | undefined): Prisma.IssueWhereInput {
  if (boardId === undefined) return {};
  if (boardId === "null") return { boardId: null };
  return { boardId };
}
