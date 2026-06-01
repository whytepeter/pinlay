# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-06-01T08:53:46.309Z
> Files: 216 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.gitignore` — Git ignore rules (~144 tok)
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

- `launch.json` (~81 tok)

## Not yet created (future phases)


## apps/api/

- `nest-cli.json` (~62 tok)
- `package.json` — Node.js package manifest (~351 tok)
- `tsconfig.build.json` (~34 tok)
- `tsconfig.json` — TypeScript configuration (~197 tok)

## apps/api/prisma/

- `schema.prisma` — Prisma schema — pinlay v1 (~1502 tok)
- `seed.ts` — prisma: main (~448 tok)

## apps/api/src/

- `app.module.ts` — Exports AppModule (~391 tok)
- `main.ts` — Declares bootstrap (~689 tok)

## apps/api/src/annotation/

- `annotation.module.ts` — Exports AnnotationModule (~126 tok)
- `annotation.service.ts` — An assignee must be a member of the caller's workspace. Without this an (~2426 tok)
- `pins.controller.ts` — Exports PinsController (~361 tok)
- `sessions.controller.ts` — Write half of the session lifecycle: finishing/submitting a capture sitting (~285 tok)

## apps/api/src/annotation/dto/

- `create-pin.dto.ts` — Exports CreatePinDto (~221 tok)
- `submit-session.dto.ts` — Exports SubmitSessionDto (~72 tok)
- `update-pin.dto.ts` — Patch shape — everything optional. (~216 tok)

## apps/api/src/attachments/

- `attachments.controller.ts` — Exports AttachmentsController (~183 tok)
- `attachments.module.ts` — Exports AttachmentsModule (~105 tok)
- `attachments.service.ts` — v1: inline storage. We persist the data URL on the row itself so the (~502 tok)

## apps/api/src/attachments/dto/

- `create-attachment.dto.ts` — Exports CreateAttachmentFileDto, CreateAttachmentDto (~169 tok)

## apps/api/src/auth/

- `auth.controller.ts` — Mirrors the extension's `Me` shape (apps/extension/src/lib/api.ts). (~632 tok)
- `auth.module.ts` — Exports AuthModule (~308 tok)
- `auth.service.ts` — Mint a JWT for a given user + active workspace. Used by signup/login here (~1530 tok)
- `dev-auth.guard.ts` — Dev-only auth guard. While real OAuth is pending, every request resolves (~535 tok)
- `jwt-auth.guard.ts` — Mark an endpoint as anonymous (no auth required). (~615 tok)

## apps/api/src/auth/dto/

- `login.dto.ts` — Exports LoginDto (~64 tok)
- `signup.dto.ts` — Plain-text password; hashed before storage. (~145 tok)

## apps/api/src/common/

- `current-user.decorator.ts` — Exports AuthenticatedUser, CurrentUser (~162 tok)
- `url.ts` — URL normalization — the single source of truth for "do these two URLs (~823 tok)

## apps/api/src/config/

- `env.ts` — Validated environment access. (~552 tok)

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

- `issue.serializers.ts` — Issue read DTOs — the dashboard's primary unit. An **Issue** is the titled (~1734 tok)
- `issues.controller.ts` — Issue read surface — the list/detail of submitted reviews. An **Issue** is (~423 tok)
- `issues.module.ts` — Exports IssuesModule (~95 tok)
- `issues.service.ts` — Issue read model — the dashboard's primary unit. An Issue is the titled (~940 tok)

## apps/api/src/issues/dto/

- `list-issues.dto.ts` — Query params for GET /api/issues — all optional filters. (~162 tok)

## apps/api/src/prisma/

- `prisma.module.ts` — Exports PrismaModule (~60 tok)
- `prisma.service.ts` — Exports PrismaService (~133 tok)

## apps/api/src/sessions/

- `sessions.controller.ts` — Session read surface — the list/detail of submitted reviews. Named for the (~450 tok)
- `sessions.module.ts` — Exports SessionsModule (~99 tok)
- `sessions.service.ts` — Dashboard read model. The dashboard's "Session" is the API's Issue (the (~951 tok)

## apps/api/src/workspace/

- `members.controller.ts` — Members of the caller's ACTIVE workspace. Scoped to it implicitly via the (~423 tok)
- `workspace.controller.ts` — Every workspace the caller belongs to — powers the switcher. (~470 tok)
- `workspace.module.ts` — Workspace (org) domain: the workspace itself + its members. Imports AuthModule (~180 tok)
- `workspace.service.ts` — A workspace as the switcher / settings render it. (~2718 tok)

## apps/api/src/workspace/dto/

- `invite-member.dto.ts` — Exports InviteMemberDto (~92 tok)
- `update-member.dto.ts` — Exports UpdateMemberDto (~42 tok)
- `update-workspace.dto.ts` — Exports UpdateWorkspaceDto (~114 tok)

## apps/extension/

- `package.json` — Node.js package manifest (~258 tok)
- `tsconfig.json` — TypeScript configuration (~77 tok)
- `vitest.config.ts` — /*.test.ts"], (~46 tok)
- `wxt.config.ts` — pinlay extension — WXT + Vue 3 + Tailwind v4. (~323 tok)

## apps/extension/public/

- `icon.svg` (~76 tok)

## apps/extension/src/assets/

- `style.css` — Styles: 5 rules, 32 vars (~685 tok)

## apps/extension/src/components/annotation/

- `AnnotationOverlay.vue` — Vue: setup (~9057 tok)
- `AnnotationPin.vue` — "draft" = composer still open; "submitted" = pin persisted. (~927 tok)
- `AnnotationPinComposer.vue` — Vue component (~7779 tok)
- `AnnotationPinDetail.vue` — Vue component (~5244 tok)

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
- `FloatingLauncher.vue` — Vue: setup (~5352 tok)
- `LauncherItem.vue` — Vue: setup (~789 tok)

## apps/extension/src/entrypoints/

- `background.ts` — Background service worker. (~1292 tok)
- `content.ts` — Content script — mounts the on-page surfaces: (~3408 tok)

## apps/extension/src/entrypoints/popup/

- `App.vue` — Resolve identity + workspace in one pass. Distinguishes 401 (not connected) (~7233 tok)
- `index.html` — pinlay (~172 tok)
- `main.ts` (~47 tok)

## apps/extension/src/lib/

- `anchor.ts` — Element anchoring for live annotation. (~4650 tok)
- `annotation-state.ts` — annotation-state (~809 tok)
- `api.ts` — API client (~1991 tok)
- `auth.ts` — Subscribe to auth changes — fires when the token is added, updated, or cleared. (~562 tok)
- `env.ts` — Exports WEB_APP_URL, API_URL (~131 tok)
- `extension.ts` — Extension runtime helpers. (~253 tok)
- `session-cache.ts` — Persisted snapshot of "who the user is" — identity (`/auth/me`) + active (~519 tok)

## apps/extension/test/

- `anchor.test.ts` — Anchor-resilience harness (Roadmap 1.2). (~1850 tok)

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

- `main.ts` (~188 tok)

## apps/web/src/app/

- `router.ts` — Exports router (~984 tok)

## apps/web/src/assets/

- `main.css` — Styles: 8 rules, 45 vars (~869 tok)

## apps/web/src/features/auth/

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

- `useIntegrations.ts` — Exports IntegrationCategory, IntegrationItem, useIntegrations (~852 tok)

## apps/web/src/features/issue/

- `IssuePage.vue` — Vue: setup (~1247 tok)

## apps/web/src/features/issue/components/

- `ActivityThread.vue` — Vue: setup (~674 tok)
- `AnchorBlock.vue` — Vue: setup (~577 tok)
- `PinDetail.vue` — Vue: setup (~1630 tok)
- `PinList.vue` — Vue: setup (~696 tok)
- `PinListItem.vue` — Vue: setup (~464 tok)
- `ReplyBox.vue` — Vue: setup (~337 tok)
- `ScreenshotViewer.vue` — Vue: setup (~647 tok)

## apps/web/src/features/issue/composables/

- `useIssue.ts` — Exports useIssue (~550 tok)

## apps/web/src/features/pinboards/

- `PinboardsPage.vue` — Vue: setup (~781 tok)

## apps/web/src/features/pinboards/components/

- `EmptyState.vue` — Vue: setup (~220 tok)
- `SessionCard.vue` — Vue: setup (~743 tok)
- `SessionFilters.vue` — Vue: setup (~1123 tok)
- `SessionRow.vue` — Vue: setup (~601 tok)

## apps/web/src/features/pinboards/composables/

- `useSessions.ts` — Exports ViewMode, StatusFilter, SeverityFilter, SortMode, useSessions (~621 tok)

## apps/web/src/features/settings/

- `SettingsPage.vue` — Vue: settings, setup (~1126 tok)

## apps/web/src/features/settings/components/

- `BillingSection.vue` — Vue: Free, setup (~1764 tok)
- `BillingSection.vue` — Free/Pro plan-comparison cards + mock setPlan; reads workspace.plan from useSettings (~500 tok)
- `DangerZoneSection.vue` — Vue: setup (~529 tok)
- `FormField.vue` — Vue: setup (~178 tok)
- `FormGroup.vue` — Vue component (~30 tok)
- `MembersSection.vue` — Vue: setup (~2171 tok)
- `NotificationsSection.vue` — Vue: setup (~479 tok)
- `ProfileSection.vue` — Vue: setup (~518 tok)
- `SectionHeading.vue` — Vue: setup (~91 tok)
- `WorkspaceSection.vue` — Vue: setup (~832 tok)

## apps/web/src/features/settings/composables/

- `useSettings.ts` — Exports MemberStatus, Member, PlanId, WorkspaceState + 3 more (~978 tok)

## apps/web/src/features/workspace-shell/

- `AppLayout.vue` — Vue: setup (~330 tok)

## apps/web/src/features/workspace-shell/components/

- `AppSidebar.vue` — Hover-expand on desktop. Stays expanded while a menu is open (so clicking the (~2895 tok)
- `StatusBar.vue` — Vue: setup (~1719 tok)
- `WorkspaceSwitcher.vue` — Vue: Acme Inc, setup (~1145 tok)

## apps/web/src/pages/

- `HomeView.vue` — Vue: setup (~3315 tok)
- `PaletteView.vue` — Vue: Blue · Zinc, setup (~1515 tok)

## apps/web/src/shared/components/

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
- `UserAvatar.vue` — Vue: setup (~245 tok)

## apps/web/src/shared/composables/

- `useAuth.ts` — Auth state — module-level singleton (same pattern as useTheme/useSettings; (~788 tok)
- `useBoards.ts` — Exports Board, BOARD_COLORS, useBoards (~619 tok)
- `useShell.ts` — Mobile: off-canvas drawer open. (Desktop sidebar is hover-expand, no state.) (~114 tok)
- `useTheme.ts` — The user's preference (light/dark/system); system follows the OS. (~404 tok)

## apps/web/src/shared/lib/

- `api.ts` — Web API client. (~1449 tok)
- `data.ts` — Mock-first seed data (SESSIONS/PEOPLE/getPins). STILL the source for PinboardsPage/useSessions/useIssue — NOT yet swapped to apiClient. (~2413 tok)
- `extension-bridge.ts` — Web → extension token handoff. (~508 tok)
- `format.ts` — Compact relative time, e.g. "5m ago", "3h ago", "2d ago". (~198 tok)
- `query-client.ts` — Shared TanStack Query QueryClient (no-retry-4xx, retry network/5xx 2×). Registered via VueQueryPlugin in main.ts. (~302 tok)
- `severity.ts` — The highest-priority severity present (drives the card's left bar). (~204 tok)

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

