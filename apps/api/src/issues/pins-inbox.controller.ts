import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { PinsInboxService } from "./pins-inbox.service";
import { ListInboxPinsDto } from "./dto/list-inbox-pins.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../common/current-user.decorator";

/**
 * GET /api/pins — the Pin Inbox, the dashboard's primary read surface.
 * Pin-centric on purpose: the dashboard shows pins, never issue aggregates
 * (product decision 2026-07-10). Writes stay under /annotation/pins.
 */
@Controller("pins")
@UseGuards(JwtAuthGuard)
export class PinsInboxController {
  constructor(private readonly inbox: PinsInboxService) {}

  /** Paginated feed. Default state=open (open + in_progress). */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInboxPinsDto,
  ) {
    return this.inbox.list(user, query);
  }

  /**
   * Distinct site hosts + counts for the filter chips.
   * Declared BEFORE `:id` so "sites" isn't swallowed as an id.
   */
  @Get("sites")
  sites(@CurrentUser() user: AuthenticatedUser) {
    return this.inbox.sites(user);
  }

  /** Single pin + sibling pills for /p/:pinId. */
  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inbox.get(user, id);
  }
}
