import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pin, Prisma } from "@prisma/client";
import { normalizeUrl } from "@pinlay/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePinDto } from "./dto/create-pin.dto";
import { UpdatePinDto } from "./dto/update-pin.dto";
import { SubmitSessionDto } from "./dto/submit-session.dto";
import { AuthenticatedUser } from "../common/current-user.decorator";

interface CreateResult {
  pin: SerializedPin;
  sessionId: string;
  issueId: string | null;
}

export interface SerializedPin {
  id: string;
  sessionId: string;
  issueId: string | null;
  index: number;
  anchor: Record<string, unknown>;
  comment: string;
  severity: Pin["severity"];
  issueType: Pin["issueType"];
  status: Pin["status"];
  assigneeId: string | null;
  labels: string[];
  createdAt: string;
}

@Injectable()
export class AnnotationService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Pins ─────────────────────────────────────────────────────────────────
  // ── Cross-tenant guards ────────────────────────────────────────────────
  /**
   * An assignee must be a member of the caller's workspace. Without this an
   * attacker could assign pins to (and thereby enumerate) user IDs from other
   * tenants. `null`/undefined clears the assignee and is always allowed.
   */
  private async assertAssigneeInWorkspace(
    workspaceId: string,
    assigneeId: string | null | undefined,
  ): Promise<void> {
    if (!assigneeId) return;
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: assigneeId },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException("Assignee is not a member of this workspace.");
    }
  }

  /** An issue the pin links to must belong to the caller's workspace. */
  private async assertIssueInWorkspace(
    workspaceId: string,
    issueId: string | null | undefined,
  ): Promise<void> {
    if (!issueId) return;
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, workspaceId },
      select: { id: true },
    });
    if (!issue) {
      throw new NotFoundException("Issue not found");
    }
  }

  async createPin(
    user: AuthenticatedUser,
    dto: CreatePinDto,
  ): Promise<CreateResult> {
    await this.assertAssigneeInWorkspace(user.workspaceId, dto.assigneeId);
    await this.assertIssueInWorkspace(user.workspaceId, dto.issueId);

    // Canonicalize the URL at the boundary so a pin filed via
    // `…/checkout/?utm_source=email` matches a revisit to `…/checkout` (and
    // vice versa). One source of truth — same function used on read below.
    const pageUrl = normalizeUrl(dto.pageUrl);

    // Lazily create the Session on the first pin of a sitting. Same goes
    // for an Issue once `submitSession` is called.
    const session = dto.sessionId
      ? await this.prisma.session.findFirst({
          where: {
            id: dto.sessionId,
            workspaceId: user.workspaceId,
          },
        })
      : await this.prisma.session.create({
          data: {
            workspaceId: user.workspaceId,
            authorId: user.id,
            pageUrl,
            status: "draft",
          },
        });

    if (!session) throw new NotFoundException("Session not found");

    const nextIndex = await this.prisma.pin.count({
      where: { sessionId: session.id },
    });

    const pin = await this.prisma.pin.create({
      data: {
        sessionId: session.id,
        issueId: dto.issueId ?? null,
        authorId: user.id,
        assigneeId: dto.assigneeId ?? null,
        index: nextIndex + 1,
        pageUrl,
        anchor: dto.anchor as Prisma.InputJsonValue,
        offsetX: dto.offsetX,
        offsetY: dto.offsetY,
        comment: dto.comment,
        severity: dto.severity,
        issueType: dto.issueType,
        status: "open",
        labels: dto.labels ?? [],
      },
    });

    return {
      pin: this.serialize(pin),
      sessionId: session.id,
      issueId: pin.issueId,
    };
  }

  async updatePin(
    user: AuthenticatedUser,
    id: string,
    dto: UpdatePinDto,
  ): Promise<SerializedPin> {
    const existing = await this.prisma.pin.findFirst({
      where: { id, session: { workspaceId: user.workspaceId } },
    });
    if (!existing) throw new NotFoundException("Pin not found");

    // Reassigning? The new assignee must also be in this workspace.
    if (dto.assigneeId !== undefined) {
      await this.assertAssigneeInWorkspace(user.workspaceId, dto.assigneeId);
    }

    const updated = await this.prisma.pin.update({
      where: { id },
      data: {
        comment: dto.comment ?? undefined,
        severity: dto.severity ?? undefined,
        issueType: dto.issueType ?? undefined,
        status: dto.status ?? undefined,
        assigneeId: dto.assigneeId === undefined ? undefined : dto.assigneeId,
        anchor:
          dto.anchor === undefined ? undefined : (dto.anchor as Prisma.InputJsonValue),
        offsetX: dto.offsetX ?? undefined,
        offsetY: dto.offsetY ?? undefined,
        labels: dto.labels ?? undefined,
      },
    });
    return this.serialize(updated);
  }

  async deletePin(user: AuthenticatedUser, id: string): Promise<void> {
    const existing = await this.prisma.pin.findFirst({
      where: { id, session: { workspaceId: user.workspaceId } },
    });
    if (!existing) throw new NotFoundException("Pin not found");
    await this.prisma.pin.delete({ where: { id } });
  }

  async listPagePins(
    user: AuthenticatedUser,
    pageUrl: string,
  ): Promise<SerializedPin[]> {
    // Same normalization applied at write time — guarantees a match regardless
    // of how the client formatted its URL (tracking params, trailing slash,
    // host case, fragment, query-param ordering).
    const normalized = normalizeUrl(pageUrl);
    const pins = await this.prisma.pin.findMany({
      where: {
        pageUrl: normalized,
        session: { workspaceId: user.workspaceId },
        status: { notIn: ["archived"] },
      },
      orderBy: [{ sessionId: "asc" }, { index: "asc" }],
    });
    return pins.map((p) => this.serialize(p));
  }

  // ── Sessions ─────────────────────────────────────────────────────────────
  async submitSession(
    user: AuthenticatedUser,
    sessionId: string,
    dto: SubmitSessionDto,
  ): Promise<{ submitted: boolean; issueId: string | null }> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, workspaceId: user.workspaceId },
      include: { pins: true, issue: true },
    });
    if (!session) throw new NotFoundException("Session not found");

    if (session.pins.length === 0) {
      // Empty session — just close it, no issue to create.
      await this.prisma.session.update({
        where: { id: session.id },
        data: { status: "archived", closedAt: new Date() },
      });
      return { submitted: false, issueId: null };
    }

    const issue = session.issue
      ? await this.prisma.issue.update({
          where: { id: session.issue.id },
          data: { title: dto.title, summary: dto.summary ?? null },
        })
      : await this.prisma.issue.create({
          data: {
            workspaceId: user.workspaceId,
            sessionId: session.id,
            authorId: user.id,
            title: dto.title,
            summary: dto.summary ?? null,
            pageUrl: session.pageUrl,
            status: "open",
          },
        });

    // Attach all of the session's pins to the issue.
    await this.prisma.pin.updateMany({
      where: { sessionId: session.id, issueId: null },
      data: { issueId: issue.id },
    });

    await this.prisma.session.update({
      where: { id: session.id },
      data: { status: "open", closedAt: new Date() },
    });

    return { submitted: true, issueId: issue.id };
  }

  // ── Serialisation ────────────────────────────────────────────────────────
  private serialize(pin: Pin): SerializedPin {
    return {
      id: pin.id,
      sessionId: pin.sessionId,
      issueId: pin.issueId,
      index: pin.index,
      anchor: pin.anchor as Record<string, unknown>,
      comment: pin.comment,
      severity: pin.severity,
      issueType: pin.issueType,
      status: pin.status,
      assigneeId: pin.assigneeId,
      labels: pin.labels,
      createdAt: pin.createdAt.toISOString(),
    };
  }
}
