import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/current-user.decorator";
import { CreateBoardDto } from "./dto/create-board.dto";
import { UpdateBoardDto } from "./dto/update-board.dto";

/** Wire shape for a board. */
export interface BoardDto {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  /** How many issues currently live in this board. */
  issueCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Compact reference embedded in IssueSummary / IssueDetail. The dashboard
 * cards only need id/name/color to render the board chip — no need to pull
 * the full board row per issue.
 */
export interface BoardRef {
  id: string;
  name: string;
  slug: string;
  color: string;
}

const ADMIN_ROLES: Role[] = [Role.owner, Role.admin];

/**
 * Lower-case, hyphen-separated slug. Mirrors the workspace slug rule so the
 * UX is consistent across the two creation flows.
 */
function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reads ──────────────────────────────────────────────────────────────
  async list(user: AuthenticatedUser): Promise<BoardDto[]> {
    const boards = await this.prisma.board.findMany({
      where: { workspaceId: user.workspaceId },
      include: { _count: { select: { issues: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return boards.map((b) => this.toDto(b));
  }

  // ── Mutations ──────────────────────────────────────────────────────────
  async create(
    user: AuthenticatedUser,
    dto: CreateBoardDto,
  ): Promise<BoardDto> {
    this.assertAdmin(user);
    const name = dto.name.trim();
    const slug = await this.resolveSlug(user.workspaceId, dto.slug, name);
    const position = dto.position ?? (await this.nextPosition(user.workspaceId));

    try {
      const created = await this.prisma.board.create({
        data: {
          workspaceId: user.workspaceId,
          name,
          slug,
          color: dto.color ?? "#7c3aed",
          position,
        },
        include: { _count: { select: { issues: true } } },
      });
      return this.toDto(created);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException(
          `A board with slug "${slug}" already exists in this workspace.`,
        );
      }
      throw err;
    }
  }

  async update(
    user: AuthenticatedUser,
    boardId: string,
    dto: UpdateBoardDto,
  ): Promise<BoardDto> {
    this.assertAdmin(user);
    await this.requireBoard(user.workspaceId, boardId);

    const patch: Prisma.BoardUpdateInput = {};
    if (typeof dto.name === "string") patch.name = dto.name.trim();
    if (typeof dto.color === "string") patch.color = dto.color;
    if (typeof dto.position === "number") patch.position = dto.position;
    if (typeof dto.slug === "string") {
      const slug = dto.slug.toLowerCase();
      // Allow the same slug (no-op) but block collisions with other rows.
      const conflict = await this.prisma.board.findFirst({
        where: {
          workspaceId: user.workspaceId,
          slug,
          NOT: { id: boardId },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          `A board with slug "${slug}" already exists in this workspace.`,
        );
      }
      patch.slug = slug;
    }

    const updated = await this.prisma.board.update({
      where: { id: boardId },
      data: patch,
      include: { _count: { select: { issues: true } } },
    });
    return this.toDto(updated);
  }

  async remove(user: AuthenticatedUser, boardId: string): Promise<void> {
    this.assertAdmin(user);
    await this.requireBoard(user.workspaceId, boardId);
    // Schema sets `Issue.boardId = NULL` on cascade; issues survive the delete.
    await this.prisma.board.delete({ where: { id: boardId } });
  }

  /**
   * Multi-tenant safety net used by Issues PATCH when assigning a board to
   * an issue. Verifies the board belongs to the caller's workspace; throws
   * 404 if not (we don't distinguish "doesn't exist" from "exists in another
   * tenant" — both are equally inaccessible).
   */
  async assertBoardInWorkspace(
    workspaceId: string,
    boardId: string,
  ): Promise<void> {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, workspaceId },
      select: { id: true },
    });
    if (!board) {
      throw new NotFoundException("Board not found in this workspace.");
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private async requireBoard(workspaceId: string, boardId: string) {
    const board = await this.prisma.board.findFirst({
      where: { id: boardId, workspaceId },
    });
    if (!board) {
      throw new NotFoundException("Board not found in this workspace.");
    }
    return board;
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (!ADMIN_ROLES.includes(user.role as Role)) {
      throw new ForbiddenException(
        "You don't have permission to manage boards.",
      );
    }
  }

  /**
   * Resolve the slug for a NEW board. User-supplied slugs throw on conflict
   * (we never silently rewrite explicit input). Derived slugs auto-suffix
   * `-2`, `-3`, … to find a free one — and finally fall back to a short
   * random suffix if the bounded retry window is exhausted.
   */
  private async resolveSlug(
    workspaceId: string,
    requested: string | undefined,
    name: string,
  ): Promise<string> {
    if (requested) {
      const slug = requested.toLowerCase();
      const existing = await this.prisma.board.findFirst({
        where: { workspaceId, slug },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `A board with slug "${slug}" already exists in this workspace.`,
        );
      }
      return slug;
    }
    const base = slugify(name);
    if (!base) {
      throw new ConflictException(
        "Board name must contain letters or digits.",
      );
    }
    const taken = await this.prisma.board.findFirst({
      where: { workspaceId, slug: base },
      select: { id: true },
    });
    if (!taken) return base;
    for (let n = 2; n <= 10; n++) {
      const candidate = `${base}-${n}`;
      const conflict = await this.prisma.board.findFirst({
        where: { workspaceId, slug: candidate },
        select: { id: true },
      });
      if (!conflict) return candidate;
    }
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private async nextPosition(workspaceId: string): Promise<number> {
    const max = await this.prisma.board.aggregate({
      where: { workspaceId },
      _max: { position: true },
    });
    return (max._max.position ?? -1) + 1;
  }

  private toDto(b: {
    id: string;
    workspaceId: string;
    name: string;
    slug: string;
    color: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { issues: number };
  }): BoardDto {
    return {
      id: b.id,
      workspaceId: b.workspaceId,
      name: b.name,
      slug: b.slug,
      color: b.color,
      position: b.position,
      issueCount: b._count?.issues ?? 0,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}
