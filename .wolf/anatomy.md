# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-27T19:24:51.294Z
> Files: 111 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `HANDOFF.md` — pinlay — Handoff (~3582 tok)
- `package.json` — Node.js package manifest (~160 tok)

## ./ (root)

- `CLAUDE.md` — OpenWolf pointer (~57 tok)
- `HANDOFF.md` — product/architecture handoff; read first (~1700 tok)
- `package.json` — workspace root; scripts dev:app/api/ext, build:* (~170 tok)
- `pnpm-lock.yaml` — lockfile (~7200 tok)
- `pnpm-workspace.yaml` — workspaces: apps/*, packages/* (~12 tok)
- `tsconfig.base.json` — shared strict TS config (bundler resolution) (~160 tok)

## .claude/

- `launch.json` (~57 tok)

## Not yet created (future phases)


## apps/extension/

- `package.json` — Node.js package manifest (~231 tok)
- `tsconfig.json` — TypeScript configuration (~72 tok)
- `wxt.config.ts` — pinlay extension — WXT + Vue 3 + Tailwind v4. (~307 tok)

## apps/web/

- `index.html` — pinlay (~184 tok)
- `package.json` — Node.js package manifest (~181 tok)
- `package.json` — Node.js package manifest (~181 tok)

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

- `main.ts` (~81 tok)

## apps/web/src/app/

- `router.ts` — Exports router (~422 tok)

## apps/web/src/assets/

- `main.css` — Styles: 8 rules, 45 vars (~869 tok)

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

- `SettingsPage.vue` — Vue: setup (~800 tok)

## apps/web/src/features/settings/components/

- `BillingSection.vue` — Vue: Free, setup (~1764 tok)
- `BillingSection.vue` — Free/Pro plan-comparison cards + mock setPlan; reads workspace.plan from useSettings (~500 tok)
- `DangerZoneSection.vue` — Vue: setup (~529 tok)
- `FormField.vue` — Vue: setup (~178 tok)
- `FormGroup.vue` — Vue component (~30 tok)
- `MembersSection.vue` — Vue: setup (~2177 tok)
- `NotificationsSection.vue` — Vue: setup (~479 tok)
- `ProfileSection.vue` — Vue: setup (~518 tok)
- `SectionHeading.vue` — Vue: setup (~91 tok)
- `WorkspaceSection.vue` — Vue: setup (~832 tok)

## apps/web/src/features/settings/composables/

- `useSettings.ts` — Exports MemberStatus, Member, PlanId, WorkspaceState + 3 more (~978 tok)

## apps/web/src/features/workspace-shell/

- `AppLayout.vue` — Vue: setup (~330 tok)

## apps/web/src/features/workspace-shell/components/

- `AppSidebar.vue` — Hover-expand on desktop. Stays expanded while a menu is open (so clicking the (~2362 tok)
- `StatusBar.vue` — Vue: setup (~1288 tok)
- `WorkspaceSwitcher.vue` — Vue: Acme Inc, setup (~1145 tok)

## apps/web/src/pages/

- `HomeView.vue` — Vue: setup (~3315 tok)
- `PaletteView.vue` — Vue: Blue · Zinc, setup (~1515 tok)

## apps/web/src/shared/components/

- `Favicon.vue` — Vue: setup (~164 tok)
- `PageHeader.vue` — Vue: setup (~244 tok)
- `PinPill.vue` — Vue: setup (~152 tok)
- `SeverityChip.vue` — Vue: setup (~149 tok)
- `SeverityDot.vue` — Vue: setup (~127 tok)
- `SeverityHeatbar.vue` — Vue: setup (~315 tok)
- `StatusChip.vue` — Vue: setup (~270 tok)
- `SyncChip.vue` — Vue: setup (~196 tok)
- `TypeChip.vue` — Vue: setup (~82 tok)
- `UserAvatar.vue` — Vue: setup (~245 tok)

## apps/web/src/shared/composables/

- `useBoards.ts` — Exports Board, BOARD_COLORS, useBoards (~619 tok)
- `useShell.ts` — Mobile: off-canvas drawer open. (Desktop sidebar is hover-expand, no state.) (~114 tok)
- `useTheme.ts` — The user's preference (light/dark/system); system follows the OS. (~404 tok)

## apps/web/src/shared/lib/

- `data.ts` — Mock-first seed data so the dashboard is fully buildable before the API (~2413 tok)
- `format.ts` — Compact relative time, e.g. "5m ago", "3h ago", "2d ago". (~198 tok)
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
- `tokens.css` — Styles: 5 rules, 87 vars (~1579 tok)

## packages/design/src/components/

- `Brand.vue` — Vue: setup (~261 tok)

## packages/design/src/components/ui/button/

- `index.ts` — Exports buttonVariants, ButtonVariants (~567 tok)

## packages/design/src/components/ui/dialog/

- `DialogOverlay.vue` — Vue: setup (~204 tok)
- `DialogScrollContent.vue` — Vue: setup (~517 tok)

## packages/design/src/components/ui/input/

- `Input.vue` — Vue: setup (~307 tok)

## packages/design/src/components/ui/select/

- `SelectItem.vue` — Vue: setup (~392 tok)
- `SelectTrigger.vue` — Vue: setup (~457 tok)

## packages/design/src/components/ui/tabs/

- `TabsList.vue` — Vue: setup (~826 tok)
- `TabsTrigger.vue` — Vue: setup (~430 tok)

## packages/design/src/components/ui/textarea/

- `Textarea.vue` — Vue: setup (~286 tok)

## packages/design/src/lib/

- `color.ts` — Tiny color helpers for deriving shades in JS (charts, dynamic accents, etc.). (~461 tok)

## packages/shared/ — `@pinlay/shared` (types + schemas)

- `src/enums.ts` — Severity, Status, DisplayStatus, PinType, SyncState, Role, IntegrationKind (zod) (~350 tok)
- `src/index.ts` — barrel (~15 tok)
- `src/schemas.ts` — zod schemas+types: Session, Pin, Anchor, SeverityCounts, User, Integration… (~1230 tok)

## specs/

- `GENERAL_SPEC.md` — General Spec (~1728 tok)
- `WEB_APP_SPEC.md` — Web App Spec (`apps/web`) (~2449 tok)

## specs/ — source of truth (7 files)

