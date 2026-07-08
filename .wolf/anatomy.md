# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-07-08T17:11:13.799Z
> Files: 251 tracked | Anatomy hits: 0 | Misses: 0

## ../../../../../private/tmp/claude-502/-Users-apple-Documents-code-pinlay/71e601eb-c5a2-42d1-bc09-a3f79d8d238d/scratchpad/

- `clear-pins.ts` — Targeted clear: wipe every pin-related row so the storage refactor gets a (~290 tok)
- `env-check.ts` (~66 tok)

## ./

- `.gitignore` — Git ignore rules (~144 tok)
- `HANDOFF_WEB_INTEGRATION.md` — Handoff — Web App Integration (~5509 tok)
- `HANDOFF.md` — pinlay — Handoff (~4508 tok)
- `package.json` — Node.js package manifest (~299 tok)
- `ROADMAP.md` — pinlay — Product Roadmap (~3286 tok)

## ./ (root)

- `CLAUDE.md` — OpenWolf pointer (~57 tok)
- `HANDOFF.md` — product/architecture handoff; read first (~1700 tok)
- `package.json` — workspace root; scripts dev:app/api/ext, build:* (~170 tok)
- `pnpm-lock.yaml` — lockfile (~7200 tok)
- `pnpm-workspace.yaml` — workspaces: apps/*, packages/* (~12 tok)
- `tsconfig.base.json` — shared strict TS config (bundler resolution) (~160 tok)

## .claude/

- `launch.json` (~146 tok)

## Not yet created (future phases)


## apps/api/

- `nest-cli.json` (~99 tok)
- `package.json` — Node.js package manifest (~351 tok)
- `tsconfig.build.json` (~34 tok)
- `tsconfig.json` — TypeScript configuration (~197 tok)

## apps/api/prisma/

- `schema.prisma` — Pending workspace invite. Created when an admin invites an email that (~2413 tok)
- `seed.ts` — prisma: main (~448 tok)

## apps/api/prisma/migrations/20260601160000_boards/

- `migration.sql` — Boards module. Workspace-scoped groupings for issues. (~398 tok)

## apps/api/prisma/migrations/20260602180000_invites/

- `migration.sql` — Invites: pending workspace memberships. (~417 tok)

## apps/api/prisma/migrations/20260603020000_pin_comments/

- `migration.sql` — Threaded discussion attached to a single pin. Workspace scoping is (~283 tok)

## apps/api/scripts/

- `backfill-issues.ts` — One-off backfill: create an Issue row for every Session that has Pins but (~510 tok)

## apps/api/src/

- `app.module.ts` — Exports AppModule (~434 tok)
- `main.ts` — Declares bootstrap (~685 tok)

## apps/api/src/annotation/

- `annotation.module.ts` — Exports AnnotationModule (~126 tok)
- `annotation.service.ts` — Reporter — used by the extension/dashboard to decide whether to show (~4854 tok)
- `pins.controller.ts` — Exports PinsController (~724 tok)
- `sessions.controller.ts` — Write half of the session lifecycle: finishing/submitting a capture sitting (~285 tok)

## apps/api/src/annotation/dto/

- `create-comment.dto.ts` — Exports CreateCommentDto (~48 tok)
- `create-pin.dto.ts` — Exports CreatePinDto (~221 tok)
- `submit-session.dto.ts` — Exports SubmitSessionDto (~72 tok)
- `update-comment.dto.ts` — Exports UpdateCommentDto (~56 tok)
- `update-pin.dto.ts` — Patch shape — everything optional. (~216 tok)

## apps/api/src/attachments/

- `attachments.controller.ts` — Step 1: get a presigned PUT URL. (~273 tok)
- `attachments.module.ts` — Exports AttachmentsModule (~135 tok)
- `attachments.service.ts` — Two-step attachment flow: (~934 tok)

## apps/api/src/attachments/dto/

- `create-attachment.dto.ts` — Request a presigned upload URL. `contentType` + `sizeBytes` are baked into (~392 tok)

## apps/api/src/auth/

- `auth.controller.ts` — Mirrors the extension's `Me` shape (apps/extension/src/lib/api.ts). (~1027 tok)
- `auth.module.ts` — Exports AuthModule (~438 tok)
- `auth.service.ts` — Shape returned by GET /auth/me and PATCH /auth/me. (~2554 tok)
- `dev-auth.guard.ts` — Dev-only auth guard. While real OAuth is pending, every request resolves (~535 tok)
- `jwt-auth.guard.ts` — Mark an endpoint as anonymous (no auth required). (~615 tok)

## apps/api/src/auth/dto/

- `avatar-upload-url.dto.ts` — Ask for a presigned URL to upload the caller's avatar. Content-type is (~152 tok)
- `login.dto.ts` — Exports LoginDto (~64 tok)
- `signup.dto.ts` — Plain-text password; hashed before storage. (~145 tok)
- `update-me.dto.ts` — Patch the caller's profile. Email is intentionally NOT mutable — changing (~230 tok)

## apps/api/src/boards/

- `boards.controller.ts` — Boards — workspace-scoped issue groupings. Reads are open to all members; (~406 tok)
- `boards.module.ts` — Boards domain: workspace-scoped issue groupings (Checkout, Marketing, …). (~162 tok)
- `boards.service.ts` — Wire shape for a board. (~2248 tok)

## apps/api/src/boards/dto/

- `create-board.dto.ts` — Auto-derived from name when omitted. Lowercase alphanumerics + hyphens, (~278 tok)
- `update-board.dto.ts` — Exports UpdateBoardDto (~169 tok)

## apps/api/src/common/

- `current-user.decorator.ts` — Exports AuthenticatedUser, CurrentUser (~162 tok)
- `url.ts` — URL normalization — the single source of truth for "do these two URLs (~823 tok)

## apps/api/src/config/

- `env.ts` — Validated environment access. (~1564 tok)

## apps/api/src/dashboard/

- `dashboard.module.ts` — Exports DashboardModule (~104 tok)
- `dashboard.serializers.ts` — Dashboard read DTOs — designed as the *right* API contract, not a mirror of (~1707 tok)
- `sessions.controller.ts` — Dashboard read surface. Distinct from the extension's /api/annotation/* (~369 tok)
- `sessions.service.ts` — Dashboard read model. The dashboard's "Session" is the API's Issue (the (~951 tok)

## apps/api/src/dashboard/dto/

- `list-sessions.dto.ts` — Query params for GET /api/sessions — all optional filters. (~164 tok)

## apps/api/src/health/

- `health.controller.ts` — Exports HealthController (~139 tok)
- `health.module.ts` — Exports HealthModule (~50 tok)

## apps/api/src/issues/

- `issue.serializers.ts` — Issue read DTOs — the dashboard's primary unit. An **Issue** is the titled (~1905 tok)
- `issues.controller.ts` — Issue read + narrow-write surface — the list/detail of submitted reviews. (~836 tok)
- `issues.module.ts` — Exports IssuesModule (~115 tok)
- `issues.service.ts` — Issue read model — the dashboard's primary unit. An Issue is the titled (~2642 tok)

## apps/api/src/issues/dto/

- `list-issues.dto.ts` — Query params for GET /api/issues — all optional filters. (~403 tok)
- `update-issue.dto.ts` — Patch surface for an issue. Each field is optional — clients send only the (~278 tok)

## apps/api/src/mail/

- `mail.module.ts` — Exports MailModule (~52 tok)
- `mail.service.ts` — Transactional email — thin wrapper around Resend's HTTP API. No SDK, (~3073 tok)

## apps/api/src/prisma/

- `prisma.module.ts` — Exports PrismaModule (~60 tok)
- `prisma.service.ts` — Exports PrismaService (~133 tok)

## apps/api/src/sessions/

- `sessions.controller.ts` — Session read surface — the list/detail of submitted reviews. Named for the (~450 tok)
- `sessions.module.ts` — Exports SessionsModule (~99 tok)
- `sessions.service.ts` — Dashboard read model. The dashboard's "Session" is the API's Issue (the (~951 tok)

## apps/api/src/storage/

- `local-upload.controller.ts` — Local upload endpoint used ONLY when STORAGE_PROVIDER=disabled. (~879 tok)
- `storage.module.ts` — Exports StorageModule (~57 tok)
- `storage.service.ts` — Object storage — Cloudflare R2 via the S3-compatible SDK. (~1248 tok)

## apps/api/src/workspace/

- `invite-accept.controller.ts` — Body for POST /api/invites/:token/accept-with-signup. Email is intentionally (~731 tok)
- `invites.controller.ts` — Pending workspace invites — sit alongside members so the Settings page can (~422 tok)
- `members.controller.ts` — Members of the caller's ACTIVE workspace. Scoped to it implicitly via the (~423 tok)
- `workspace.controller.ts` — Every workspace the caller belongs to — powers the switcher. (~652 tok)
- `workspace.module.ts` — Workspace (org) domain: the workspace itself + its members + pending (~305 tok)
- `workspace.service.ts` — Reserved subdomain-ish slugs that we never want a workspace to claim — they (~8718 tok)

## apps/api/src/workspace/dto/

- `create-workspace.dto.ts` — Create a new workspace. The caller becomes the owner; the response includes (~238 tok)
- `invite-member.dto.ts` — Exports InviteMemberDto (~92 tok)
- `update-member.dto.ts` — Exports UpdateMemberDto (~42 tok)
- `update-workspace.dto.ts` — Workspace URL slug. Lowercase alphanumerics + hyphens, 2–60 chars, (~228 tok)

## apps/extension/

- `package.json` — Node.js package manifest (~258 tok)
- `tsconfig.json` — TypeScript configuration (~77 tok)
- `vitest.config.ts` — /*.test.ts"], (~46 tok)
- `wxt.config.ts` — pinlay extension — WXT + Vue 3 + Tailwind v4. (~420 tok)

## apps/extension/public/

- `icon.svg` (~76 tok)

## apps/extension/src/assets/

- `style.css` — Styles: 5 rules, 32 vars (~685 tok)

## apps/extension/src/components/annotation/

- `AnnotationOverlay.vue` — Vue component (~13027 tok)
- `AnnotationPin.vue` — "draft" = composer still open; "submitted" = pin persisted. (~1143 tok)
- `AnnotationPinComposer.vue` — Vue component (~9386 tok)
- `AnnotationPinDetail.vue` — Vue component (~7175 tok)

## apps/extension/src/components/capture/

- `RegionSelector.vue` — Vue: setup (~1331 tok)

## apps/extension/src/components/capture/markup/

- `MarkupCanvas.vue` — Vue: setup (~1311 tok)
- `MarkupToolbar.vue` — Vue: setup (~1807 tok)
- `MarkupView.vue` — Vue: setup (~1096 tok)
- `types.ts` — Markup tool + shape types. (~309 tok)
- `useMarkupCanvas.ts` — useMarkupCanvas (~6016 tok)

## apps/extension/src/components/launcher/

- `ConnectPrompt.vue` — Vue: setup (~400 tok)
- `FloatingLauncher.vue` — Vue: setup (~6396 tok)
- `LauncherItem.vue` — Vue: setup (~1061 tok)

## apps/extension/src/entrypoints/

- `background.ts` — Background service worker. (~1540 tok)
- `content.ts` — Content script — mounts the on-page surfaces: (~6844 tok)

## apps/extension/src/entrypoints/popup/

- `App.vue` — Resolve identity + workspace in one pass. Distinguishes 401 (not connected) (~13322 tok)
- `index.html` — pinlay (~170 tok)
- `main.ts` (~47 tok)

## apps/extension/src/lib/

- `anchor.ts` — Element anchoring for live annotation. (~5704 tok)
- `annotation-state.ts` — annotation-state (~1113 tok)
- `api.ts` — API client (~2590 tok)
- `auth.ts` — Subscribe to auth changes — fires when the token is added, updated, or cleared. (~562 tok)
- `env.ts` — Exports WEB_APP_URL, API_URL (~131 tok)
- `extension.ts` — Extension runtime helpers. (~253 tok)
- `session-cache.ts` — Persisted snapshot of "who the user is" — identity (`/auth/me`) + active (~519 tok)

## apps/extension/test/

- `anchor.test.ts` — Anchor-resilience harness (Roadmap 1.2). (~3486 tok)

## apps/web/

- `index.html` — pinlay (~184 tok)
- `package.json` — Node.js package manifest (~181 tok)
- `package.json` — Node.js package manifest (~181 tok)
- `vercel.json` (~78 tok)
- `vite.config.ts` (~195 tok)

## apps/web/ — `@pinlay/app` (the dashboard)

- `env.d.ts` — vite client + *.vue shim (~70 tok)
- `index.html` — Geist fonts, data-theme="light", mounts /src/main.ts (~170 tok)
- `package.json` — vue, vue-router, @pinlay/{design,shared}; vite/tailwind v4 (~180 tok)
- `src/App.vue` — `<RouterView/>` (~20 tok)
- `src/app/router.ts` — routes (currently `/` → HomeView) (~75 tok)
- `src/assets/main.css` — `@import tailwindcss`; @theme inline maps tokens→utilities; dark custom-variant; base layer (~700 tok)
- `src/main.ts` — mounts App with router; imports main.css + tokens.css (~80 tok)
- `src/pages/HomeView.vue` — design-system check page (exercises every component) (~1500 tok)
- `tsconfig.json` — extends base; @/@ui paths; vite/client types (~90 tok)
- `vite.config.ts` — vue + @tailwindcss/vite plugins; @/@ui aliases; /api proxy→:8787 (~170 tok)

## apps/web/public/

- `favicon.svg` (~76 tok)

## apps/web/src/

- `App.vue` — Vue: setup (~998 tok)
- `main.ts` (~197 tok)

## apps/web/src/app/

- `router.ts` — Exports router (~1074 tok)

## apps/web/src/assets/

- `main.css` — Styles: 8 rules, 45 vars (~869 tok)

## apps/web/src/features/auth/

- `AcceptInviteView.vue` — Public invite-accept page reached from an invite link (~2865 tok)
- `AuthLayout.vue` — Vue: setup (~648 tok)
- `ConnectExtensionView.vue` — Vue: login, setup (~1240 tok)
- `LoginView.vue` — Vue: signup, setup (~886 tok)
- `SignupView.vue` — Vue: login, setup (~1079 tok)

## apps/web/src/features/dashboard/

- `DashboardPage.vue` — Vue: setup (~187 tok)

## apps/web/src/features/integrations/

- `IntegrationsPage.vue` — Vue: setup (~843 tok)

## apps/web/src/features/integrations/components/

- `IntegrationCard.vue` — Vue: setup (~1655 tok)

## apps/web/src/features/integrations/composables/

- `useIntegrations.ts` — TODO(api): integrations/ module is not built yet (Roadmap Phase 3). Today (~981 tok)

## apps/web/src/features/issue/

- `IssuePage.vue` — Single mutation handles every issue patch (board / status / title). The (~5069 tok)

## apps/web/src/features/issue/components/

- `ActivityThread.vue` — Real activity thread for a single pin. (~3010 tok)
- `AnchorBlock.vue` — Vue: setup (~815 tok)
- `IssuePageSkeleton.vue` — Vue: setup (~1079 tok)
- `PinDetail.vue` — Whether the current user can delete this pin (author or admin). (~3023 tok)
- `PinList.vue` — Vue: setup (~734 tok)
- `PinListItem.vue` — Vue: setup (~458 tok)
- `ReplyBox.vue` — Vue: setup (~337 tok)
- `ScreenshotViewer.vue` — Vue: setup (~853 tok)

## apps/web/src/features/issue/composables/

- `useIssue.ts` — Replace the selected pin's labels[]. Caller passes the full new list — (~1293 tok)

## apps/web/src/features/pinboards/

- `PinboardsPage.vue` — Vue: setup (~1970 tok)

## apps/web/src/features/pinboards/components/

- `EmptyState.vue` — Vue: setup (~220 tok)
- `SessionCard.vue` — Vue: setup (~825 tok)
- `SessionCardSkeleton.vue` — Vue: setup (~330 tok)
- `SessionFilters.vue` — Vue: setup (~1148 tok)
- `SessionRow.vue` — Vue: setup (~631 tok)
- `SessionRowSkeleton.vue` — Vue: setup (~244 tok)

## apps/web/src/features/pinboards/composables/

- `useSessions.ts` — Stores the reporter's userId (not the workspace-member-row id). (~1376 tok)

## apps/web/src/features/settings/

- `SettingsPage.vue` — Vue: settings, setup (~1126 tok)

## apps/web/src/features/settings/components/

- `BillingSection.vue` — Vue: Free, setup (~1764 tok)
- `BillingSection.vue` — Free/Pro plan-comparison cards + mock setPlan; reads workspace.plan from useSettings (~500 tok)
- `DangerZoneSection.vue` — Vue: login, setup (~1469 tok)
- `FormField.vue` — Vue: setup (~178 tok)
- `FormGroup.vue` — Vue component (~30 tok)
- `MembersSection.vue` — Vue: setup (~3542 tok)
- `NotificationsSection.vue` — Vue: setup (~479 tok)
- `ProfileSection.vue` — Vue: setup (~1523 tok)
- `SectionHeading.vue` — Vue: setup (~91 tok)
- `WorkspaceSection.vue` — Vue: setup (~1689 tok)

## apps/web/src/features/settings/composables/

- `useSettings.ts` — TODO(api): settings is a junk-drawer composable that bundles 5 concerns (~1168 tok)

## apps/web/src/features/workspace-shell/

- `AppLayout.vue` — Vue: setup (~330 tok)

## apps/web/src/features/workspace-shell/components/

- `AppSidebar.vue` — Hover-expand on desktop. Stays expanded while a menu is open (so clicking the (~5079 tok)
- `StatusBar.vue` — Vue: settings, setup (~2749 tok)
- `WorkspaceSwitcher.vue` — Shared post-switch reconciliation: replace the bearer token, drop every (~2289 tok)

## apps/web/src/pages/

- `HomeView.vue` — Vue: setup (~3315 tok)
- `PaletteView.vue` — Vue: Blue · Zinc, setup (~1515 tok)

## apps/web/src/shared/components/

- `ConfirmDialog.vue` — Vue: setup (~623 tok)
- `DetailsList.vue` — REUSABLE. Fetch ONE record by id via TanStack Query; owns loading/error+retry/empty/refetching. Slots: #default="{ data, refetch, isFetching }", #loading, #error, #empty. Use for issue/pin/workspace detail. (~1204 tok)
- `Favicon.vue` — Vue: setup (~164 tok)
- `PageHeader.vue` — Vue: setup (~244 tok)
- `PinPill.vue` — Vue: setup (~152 tok)
- `QueryList.vue` — REUSABLE. THE list primitive (TanStack Query). Owns loading/error+retry/empty/refetch/pagination. mode=load-more|infinite|paged. Slots: #default/#item/#loading/#error/#empty/#load-more/#pagination. Defaults to API page shape {items,total,limit,offset}. Use for ALL lists (issues, pins, members) — don't hand-roll loading/error. (~3810 tok)
- `SeverityChip.vue` — Vue: setup (~149 tok)
- `SeverityDot.vue` — Vue: setup (~127 tok)
- `SeverityHeatbar.vue` — Vue: setup (~315 tok)
- `StatusChip.vue` — Vue: setup (~270 tok)
- `SyncChip.vue` — Vue: setup (~196 tok)
- `TypeChip.vue` — Vue: setup (~82 tok)
- `UserAvatar.vue` — Vue: setup (~299 tok)

## apps/web/src/shared/composables/

- `useAuth.ts` — Auth state — module-level singleton (same pattern as useTheme/useSettings; (~1050 tok)
- `useBoards.ts` — Boards = workspace-scoped groupings backed by the /api/boards module. (~1410 tok)
- `useShell.ts` — Mobile: off-canvas drawer open. (Desktop sidebar is hover-expand, no state.) (~114 tok)
- `useTheme.ts` — The user's preference (light/dark/system); system follows the OS. (~404 tok)

## apps/web/src/shared/lib/

- `api.ts` — Web API client. (~4156 tok)
- `confirm.ts` — Promise-based confirm dialog with optional async action. (~1341 tok)
- `data.ts` — Mock-first seed data (SESSIONS/PEOPLE/getPins). STILL the source for PinboardsPage/useSessions/useIssue — NOT yet swapped to apiClient. (~2413 tok)
- `extension-bridge.ts` — Web → extension token handoff. (~508 tok)
- `format.ts` — Compact relative time, e.g. "5m ago", "3h ago", "2d ago". (~198 tok)
- `issue-display.ts` — Client-derived display fields for an issue summary. The API intentionally (~350 tok)
- `query-client.ts` — Shared TanStack Query QueryClient (no-retry-4xx, retry network/5xx 2×). Registered via VueQueryPlugin in main.ts. (~302 tok)
- `severity.ts` — The highest-priority severity present (drives the card's left bar). (~204 tok)
- `toast.ts` — Thin wrapper over vue-sonner so the rest of the app imports one path. (~362 tok)

## packages/design/

- `components.json` (~125 tok)
- `tsconfig.json` — TypeScript configuration (~62 tok)

## packages/design/ — `@pinlay/design` (shadcn-vue + Tailwind v4)

- `components.json` — shadcn-vue config (new-york, lucide, aliases) (~130 tok)
- `package.json` — reka-ui, cva, clsx, tailwind-merge, lucide-vue-next; @pinlay/shared (~200 tok)
- `src/icons/icon-paths.ts` — name→inner-SVG map (~1585 tok)
- `src/icons/Icon.vue` — single `<Icon name size stroke>` wrapper + Brand mark (~330 tok)
- `src/index.ts` — public barrel: Icon, shadcn primitives, pinlay components, cn, severity helpers (~580 tok)
- `src/lib/severity.ts` — topSeverity, severityColor, SEVERITY_ORDER (~185 tok)
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge) (~50 tok)
- `src/shims-vue.d.ts` — *.vue module shim (~56 tok)
- `src/tokens.css` — pinlay primitives + shadcn semantic vars (light-first, amber→--primary); base resets, .mono, pulse-glow (~1400 tok)

## packages/design/src/

- `index.ts` — Import "@pinlay/design/tokens.css" once in the host app. Components are (~382 tok)
- `tokens.css` — Styles: 5 rules, 87 vars (~1580 tok)

## packages/design/src/components/

- `Brand.vue` — Vue: setup (~261 tok)

## packages/design/src/components/ui/button/

- `index.ts` — Exports buttonVariants, ButtonVariants (~567 tok)

## packages/design/src/components/ui/dialog/

- `DialogOverlay.vue` — Vue: setup (~204 tok)
- `DialogScrollContent.vue` — Vue: setup (~517 tok)

## packages/design/src/components/ui/dropdown-menu/

- `DropdownMenuContent.vue` — Vue: setup (~509 tok)
- `DropdownMenuSubContent.vue` — Vue: setup (~347 tok)

## packages/design/src/components/ui/input/

- `Input.vue` — Vue: setup (~307 tok)

## packages/design/src/components/ui/popover/

- `PopoverContent.vue` — Vue: setup (~390 tok)

## packages/design/src/components/ui/select/

- `SelectContent.vue` — Vue: setup (~524 tok)
- `SelectItem.vue` — Vue: setup (~392 tok)
- `SelectTrigger.vue` — Vue: setup (~457 tok)

## packages/design/src/components/ui/skeleton/

- `Skeleton.vue` — Vue: setup (~96 tok)

## packages/design/src/components/ui/tabs/

- `TabsList.vue` — Vue: setup (~826 tok)
- `TabsTrigger.vue` — Vue: setup (~430 tok)

## packages/design/src/components/ui/textarea/

- `Textarea.vue` — Vue: setup (~286 tok)

## packages/design/src/lib/

- `color.ts` — Tiny color helpers for deriving shades in JS (charts, dynamic accents, etc.). (~461 tok)

## packages/shared/

- `package.json` — Node.js package manifest (~233 tok)
- `tsconfig.build.json` (~125 tok)

## packages/shared/ — `@pinlay/shared` (types + schemas)

- `src/enums.ts` — Severity, Status, DisplayStatus, PinType, SyncState, Role, IntegrationKind (zod) (~350 tok)
- `src/index.ts` — barrel (~15 tok)
- `src/schemas.ts` — zod schemas+types: Session, Pin, Anchor, SeverityCounts, User, Integration… (~1230 tok)

## packages/shared/src/

- `index.ts` (~22 tok)
- `url.ts` — URL normalization — the single source of truth for "do these two URLs (~812 tok)

## specs/

- `BACKEND_SPEC.md` — Backend Spec (`apps/api`) (~2017 tok)
- `GENERAL_SPEC.md` — General Spec (~2014 tok)
- `WEB_APP_SPEC.md` — Web App Spec (`apps/web`) (~2449 tok)

## specs/ — source of truth (7 files)

