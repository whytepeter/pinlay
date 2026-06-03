import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { ListIssuesDto } from "./dto/list-issues.dto";
import { UpdateIssueDto } from "./dto/update-issue.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../common/current-user.decorator";

/**
 * Issue read + narrow-write surface — the list/detail of submitted reviews.
 * An **Issue** is the titled collection of pins created on submit; the
 * dashboard's primary unit. The extension's WRITE surface (create pin,
 * submit) lives under /api/annotation/*.
 */
@Controller("issues")
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  /** GET /api/issues — paginated, filterable list for the dashboard feed. */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListIssuesDto,
  ) {
    return this.issues.list(user, query);
  }

  /**
   * GET /api/issues/counts — issue count per status, honoring non-status
   * filters. Powers the status tab counts in the filter bar so the numbers
   * stay accurate when a severity / reporter / board / search filter is on.
   *
   * Declared BEFORE `:id` so `counts` doesn't get swallowed as an id param.
   */
  @Get("counts")
  counts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListIssuesDto,
  ) {
    // `status` from the query is intentionally ignored — the response gives
    // counts for ALL statuses, not just the active one.
    const { status: _ignored, limit: _l, offset: _o, ...rest } = query;
    void _ignored;
    void _l;
    void _o;
    return this.issues.counts(user, rest);
  }

  /** GET /api/issues/:id — single issue for the detail header. */
  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.issues.get(user, id);
  }

  /** GET /api/issues/:id/pins — pins for the issue detail page. */
  @Get(":id/pins")
  pins(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.issues.listPins(user, id);
  }

  /**
   * PATCH /api/issues/:id — narrow patch surface. v1 only exposes board
   * assignment (boardId | null). Title/status/etc. will land here as those
   * write paths come online.
   */
  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issues.update(user, id, dto);
  }
}
