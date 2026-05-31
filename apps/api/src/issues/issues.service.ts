import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { ListIssuesDto } from "./dto/list-issues.dto";
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

/**
 * Issue read model — the dashboard's primary unit. An Issue is the titled
 * collection of pins produced when a review is submitted. Everything here is
 * workspace-scoped via `user.workspaceId` — cross-tenant ids never resolve.
 */
@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: ListIssuesDto,
  ): Promise<PaginatedIssues> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const where: Prisma.IssueWhereInput = {
      workspaceId: user.workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.pageUrl ? { pageUrl: query.pageUrl } : {}),
      ...(query.q
        ? { title: { contains: query.q, mode: "insensitive" } }
        : {}),
    };

    const [issues, total] = await this.prisma.$transaction([
      this.prisma.issue.findMany({
        where,
        include: {
          author: true,
          // Only the fields the counts need — keeps the list query lean.
          pins: { select: { severity: true, status: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.issue.count({ where }),
    ]);

    return { items: issues.map(toIssueSummary), total, limit, offset };
  }

  async get(user: AuthenticatedUser, id: string): Promise<IssueDetailDto> {
    const issue = await this.prisma.issue.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: {
        author: true,
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
}
