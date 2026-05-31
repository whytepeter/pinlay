import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { ListIssuesDto } from "./dto/list-issues.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../common/current-user.decorator";

/**
 * Issue read surface — the list/detail of submitted reviews. An **Issue** is
 * the titled collection of pins created on submit; the dashboard's primary
 * unit. Named for the resource, not a consumer: the web dashboard reads it
 * today, but a CLI or public API would use the same routes. The extension's
 * WRITE surface (create pin, submit) lives under /api/annotation/*.
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
}
