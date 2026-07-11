import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { ListInboxPinsDto } from "./dto/list-inbox-pins.dto";
import {
  InboxPinDetailDto,
  InboxPinDto,
  toInboxPin,
  toInboxPinDetail,
} from "./issue.serializers";

export interface PaginatedInboxPins {
  items: InboxPinDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface SiteBucket {
  host: string;
  count: number;
}

// Feed row include — author/assignee/attachments for the row itself, plus a
// compact issue ref for the back-link. Sibling pins are only loaded on detail.
const INBOX_INCLUDE = {
  author: true,
  assignee: true,
  attachments: true,
  issue: true,
} satisfies Prisma.PinInclude;

/**
 * The Pin Inbox — the dashboard's read surface after the 2026-07-10 rebuild.
 * One noun: the feed lists PINS, not issues. The Session→Issue→Pin schema is
 * unchanged; this service is a presentation-level flattening.
 *
 * Workspace scoping is transitive (pin → session → workspace), matching the
 * annotation module's convention.
 */
@Injectable()
export class PinsInboxService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: ListInboxPinsDto,
  ): Promise<PaginatedInboxPins> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const where = this.buildWhere(user, query);

    const [pins, total] = await this.prisma.$transaction([
      this.prisma.pin.findMany({
        where,
        include: INBOX_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.pin.count({ where }),
    ]);

    return { items: pins.map(toInboxPin), total, limit, offset };
  }

  async get(user: AuthenticatedUser, id: string): Promise<InboxPinDetailDto> {
    const pin = await this.prisma.pin.findFirst({
      where: { id, session: { workspaceId: user.workspaceId } },
      include: {
        ...INBOX_INCLUDE,
        issue: {
          include: {
            pins: {
              select: { id: true, index: true, comment: true, status: true },
              orderBy: { index: "asc" },
            },
          },
        },
      },
    });
    if (!pin) throw new NotFoundException("Pin not found");
    return toInboxPinDetail(pin);
  }

  /**
   * Distinct site hosts across the workspace's pins, with counts — drives
   * the site filter chips. Parsed server-side so the client never touches
   * raw URL variance (protocol, path, query).
   */
  async sites(user: AuthenticatedUser): Promise<SiteBucket[]> {
    const rows = await this.prisma.pin.findMany({
      where: { session: { workspaceId: user.workspaceId } },
      select: { pageUrl: true },
    });
    const buckets = new Map<string, number>();
    for (const { pageUrl } of rows) {
      const host = hostOf(pageUrl);
      if (!host) continue;
      buckets.set(host, (buckets.get(host) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count);
  }

  private buildWhere(
    user: AuthenticatedUser,
    query: ListInboxPinsDto,
  ): Prisma.PinWhereInput {
    const state = query.state ?? "open";
    const stateClause: Prisma.PinWhereInput =
      state === "open"
        ? { status: { in: ["open", "in_progress"] } }
        : state === "resolved"
          ? { status: "resolved" }
          : { status: { not: "archived" } };

    return {
      session: { workspaceId: user.workspaceId },
      ...stateClause,
      ...(query.site ? { pageUrl: { contains: `//${query.site}` } } : {}),
      ...(query.q
        ? { comment: { contains: query.q, mode: "insensitive" } }
        : {}),
    };
  }
}

function hostOf(pageUrl: string): string | null {
  try {
    return new URL(pageUrl).host || null;
  } catch {
    return null;
  }
}
