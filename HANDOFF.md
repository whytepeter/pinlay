# pinlay — Handoff

> Read this first. It tells you what pinlay is, what's built today, the
> conventions to follow, and what's next. Then read `specs/` (start with
> `specs/README.md`) for the deeper product/architecture spec.

_Last updated: 2026-05-30._
_Stack reconciled: backend is **NestJS + Prisma + Postgres** (not the original
Hono/Workers/Drizzle). `apps/extension` and `apps/api` are now scaffolded (the
⏳ markers below predate that). For current build priorities and the committed
product wedge, **`ROADMAP.md` is the authority**; the theme section §5 still
lists the old Supabase-green accent — current accent is violet `#7c3aed`._

---

## 1. What pinlay is

A standalone, browser-first annotation product spun out of DevProbe's live-
annotation feature. Users drop visual **pins** on live web pages (anchored to
real DOM elements); pins roll up into **sessions** that teams triage in a web
dashboard and sync to Linear / Jira / GitHub. _"Figma comments for your live
product."_

Not a screen recorder. Not a heavy bug tool. A precise, lightweight annotation
layer. **Keep the UI simple.**

---

## 2. Repo at a glance

```
pinlay/
├── apps/
│   ├── web/                         # @pinlay/web — the dashboard (Vue 3 + Vite + Tailwind v4) ✅
│   ├── extension/                   # @pinlay/extension — browser capture surface (manifest v3) ⏳
│   └── api/                         # @pinlay/api — NestJS + Prisma + Postgres ⏳ scaffolded
├── packages/
│   ├── design/                      # @pinlay/design — shadcn-vue + Tailwind v4 primitives + tokens ✅
│   ├── shared/                      # @pinlay/shared — enums + zod schemas + TS types ✅
│   └── inject/                      # @pinlay/inject — page-side runtime shared with extension ⏳
├── specs/                           # product/architecture source of truth
├── HANDOFF.md                       # this file
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json                     # workspace scripts: dev:web, build:web, typecheck, …
```

**Stack:** pnpm monorepo · Vue 3 + Vite + Tailwind v4 · shadcn-vue (reka-ui) ·
Geist / Geist Mono · zod. Node 20+, pnpm 10.

**Status legend:** ✅ built and shipping · ⏳ folder reserved, not yet scaffolded
(empty `.gitkeep` placeholder; add `package.json` when work starts on it).

---

## 3. What's built today

### `@pinlay/shared`

Zod enums and schemas — the contract that the app and (future) API share.

- `enums.ts` — `Severity`, `Status`, `DisplayStatus`, `PinType`, `SyncState`,
  `Role`, `IntegrationKind`.
- `schemas.ts` — `Org`, `User`, `Membership`, `Pinboard`, `Session`, `Pin`,
  `Anchor`, `Comment`, `ActivityEvent`, `Integration`, `SyncRecord`,
  `SeverityCounts`.

### `@pinlay/design`

shadcn-vue + Tailwind v4 component library installed via the shadcn CLI.

- **shadcn primitives** (`src/components/ui/`): button, input, label, textarea,
  card (+ parts), badge, separator, skeleton, avatar (+ image/fallback),
  tooltip, dialog (+ parts), dropdown-menu (+ items/sub/radio/checkbox),
  popover, select, tabs, switch, checkbox. Customized in-place (no per-call-site
  overrides):
  - Solid-bg variants of Button + active `TabsTrigger` carry a 1px border in a
    slightly deeper shade of their own bg (`color-mix(in oklab, var(--…) 85–92%, #000)`).
  - `shadow-xs` removed from Button (outline) / Input / Textarea / Select trigger.
  - Active `TabsTrigger` = solid `bg-primary` + `text-primary-foreground`, no shadow.
- **Icon** (`src/components/Icon.vue`) — thin wrapper around `lucide-vue-next`
  resolving kebab `name` (`"chevron-down"` → `ChevronDown`).
- **`tokens.css`** — pinlay primitives (bg/text/border/severity/status,
  fonts, radii, sidebar surface) + shadcn semantic vars mapped onto them. The
  brand accent is set ONCE as `--primary`; `--primary-hover/soft/glow` derive
  via `color-mix(in oklab, …)` so swapping the accent is a one-line change.
- **`lib/`** — `cn()` (clsx + tailwind-merge) and a `color.ts` utility
  (`lighten`, `darken`, `mix`, `withAlpha`) for JS shade derivation.

### `@pinlay/web`

Vue 3 + Vite + Tailwind v4. Light-first; dark + system supported.

```
apps/web/src/
├── main.ts                            # initTheme() → mount; imports main.css + tokens.css
├── App.vue                            # <RouterView/>
├── app/router.ts                      # routes (issue is a CHILD of AppLayout)
├── assets/main.css                    # @import tailwindcss; @source design; @theme inline → utilities;
│                                      # @custom-variant dark ([data-theme=dark]); base layer.
├── pages/                             # standalone (no shell): HomeView (design check), PaletteView
├── shared/
│   ├── components/                    # APP-level domain components (Favicon, SeverityDot/Chip/Heatbar,
│   │                                  # StatusChip, SyncChip, UserAvatar, PinPill, TypeChip, PageHeader)
│   ├── composables/                   # useTheme (light|dark|system, persisted), useShell (mobile drawer)
│   └── lib/                           # data.ts (mock PEOPLE/SESSIONS + getPins/getActivity),
│                                      # format.ts (timeAgo), severity.ts (topSeverity, sevBg)
└── features/
    ├── workspace-shell/               # AppLayout + AppSidebar + StatusBar + WorkspaceSwitcher
    ├── pinboards/                     # PinboardsPage + SessionFilters/Card/Row/EmptyState + useSessions
    ├── issue/                         # IssuePage + PinList/PinListItem/PinDetail/
    │                                  # ScreenshotViewer/AnchorBlock/ActivityThread/ReplyBox + useIssue
    ├── dashboard/                     # placeholder
    ├── integrations/                  # placeholder grid
    └── settings/                      # placeholder
```

**App shell.** `AppLayout` = fixed `AppSidebar` (Supabase-style icon rail that
hover-expands into a floating overlay — content never shifts) + sticky
`StatusBar` (top bar with the global search trigger ⌘K + theme cycle +
notifications) + `<RouterView/>`, all wrapped in one `TooltipProvider`. The
StatusBar hides on `/s/:id` since IssuePage has its own header.

**Sidebar.** Permanent `w-16` rail; on hover (or while a menu is open)
expands to `w-64` as a floating overlay with a shadow — `md:pl-16` on the
content column never changes. Sections: brand → workspace switcher → nav
(Pinboards / Dashboard / Integrations / Settings) → Boards quick-list → user
dropdown. Active nav = a left accent bar in the primary color + darker-
primary label + bright-primary icon, NO background fill. Pinboards stays
active on `/s/:id` (issue is a child view).

**Pinboards feed (`/`).** PageHeader + `SessionFilters` (status `Tabs` w/
counts, severity & assignee `Select`, search, sort, grid/list toggle — every
control wired via `defineModel`) + `SessionCard` grid (or `CompactList` rows)
or `EmptyState`. Cards link to `/s/:id`. State + filtering in
`composables/useSessions.ts`. Mock-first behind the composable; swap data
source, not components.

**Issue detail (`/s/:id`).** Lives **inside** the layout (sidebar visible);
StatusBar hidden so IssuePage's own header runs the full width. Two-column on
md+ (PinList 340px rail + PinDetail), with a prominent full-width Pins/Detail
switcher on mobile (active = solid primary). PinDetail header = chips row
(pin pill, severity, type, stale, prev/next K/J) + actions row (assignee
picker, status picker with dot+label, Resolve) + title. Body = body text →
ScreenshotViewer (faux browser chrome + dashed pinned-element outline +
pulsing pin marker, with a neutral "Screenshot" placeholder until real
captures wire up) → AnchorBlock (collapsible Tag/Role/CSS selector/XPath/
Text/bbox grid) → ActivityThread (comment cards + system events timeline) →
ReplyBox. J/↓ and K/↑ navigate pins (ignored while typing). Status /
assignee / Resolve mutate the pin via `useIssue.setStatus` / `setAssignee`
(mock — swap behind the composable). Copy link copies the URL; Open on page
opens the session URL; View in {integration} is a placeholder.

---

## 4. Conventions (read these — they're load-bearing)

- **UI = shadcn-vue + Tailwind v4 utilities.** No hand-written component CSS
  (no scoped `<style>` blocks of bespoke styling). Inline dynamic styles for
  truly dynamic values (hue gradients, runtime colors) are fine.
- **Customize design-system defaults IN the component**, not via repeated
  per-call-site class overrides. If you need a recurring style, bake it into
  the component in `@pinlay/design`.
- **Domain components live in the app**, not the design package.
  `@pinlay/design` only holds reusable primitives + Icon + utilities.
  Domain pieces (StatusChip, SeverityHeatbar, PinPill, UserAvatar, etc.) live
  in `apps/web/src/shared/components/`.
- **Tailwind v4 monorepo gotcha:** the app's `main.css` MUST include
  `@source "../../../../packages/design/src";` — Tailwind otherwise skips
  node_modules and won't generate classes used inside the package.
- **shadcn-vue CLI:** run from `packages/design`
  (`pnpm dlx shadcn-vue@latest add <comp> -y -o`). Repoint `@lucide/vue` →
  `lucide-vue-next` on the generated files (the registry uses the scoped
  lucide name).
- **Flat aesthetic:** no shadows on form controls. Solid-bg buttons / avatars
  + the active Tabs trigger carry a 1px border in a slightly-deeper shade of
  their own bg (~85–92% via `color-mix`). If a de-shadowed component is
  border-less, add `border border-border`.
- **Icons:** always `<Icon name="…">` from `@pinlay/design`, kebab-case
  names. Don't import lucide directly outside the design package.
- **Mock-first behind composables.** `useSessions`, `useIssue` hide the data
  source. When the API lands, swap inside the composable, not in components.
- **Be realistic — build what can be integrated.** Don't blindly mirror the
  spec's visuals. Static mockup-only elements get removed (see: dropped
  Export PNG, dropped faux page-content bars inside ScreenshotViewer).
- **Don't follow the Claude Design bundle** (`packages/design/reference/`).
  Design our own simple, UX-friendly UI. (Overrides the original handoff's
  "reuse Claude Design tokens" guidance — the user said so explicitly.)
- **No git worktrees / isolated workspaces.** Work directly on the branch.

---

## 5. Theme

- **Accent — Supabase green `#3FCF8E`** (`--primary-foreground #04231a` = DARK
  ink, since the green is light — Supabase does the same).
- **Neutrals — cool zinc** (page `#fafafa`, card `#fff`, muted `#f4f4f5`,
  border `#e4e4e7`, text `#09090b` / `#71717a`). Dark = zinc dark
  (`#09090b` / `#18181b` / `#27272a` / …).
- **3-mode theme toggle** (light / dark / system) in the StatusBar; `system`
  follows `prefers-color-scheme` live. Persisted in `localStorage` under
  `pl-theme`. The runtime attribute is `<html data-theme="light|dark">` —
  the dark Tailwind variant is `@custom-variant dark ([data-theme=dark] *)`.
- **Severity (semantic, kept standard):** critical `#ef4444`, high `#f97316`,
  medium `#eab308`, low `#3b82f6`. Resolved `#10b981`.
- **Swapping the accent** = change `--primary` in
  `packages/design/src/tokens.css`. `--primary-hover/soft/glow` derive via
  `color-mix(in oklab, …)` automatically. Accent history:
  amber → `#7044C9` → `#AB87FF` → `#8A84E2` → `#306D29` → `#B17457` →
  `#27667B` → `#00B9A8` → `#3FCF8E` (current).
- **Fonts:** Geist + Geist Mono from Google Fonts (`apps/web/index.html`),
  mapped to `--font-sans` / `--font-mono`, available as `font-sans` /
  `font-mono`.
- **Sidebar surface** = `--sidebar` (white in light, `#18181b` in dark); hover
  uses `--sidebar-accent`.

---

## 6. Running it

```bash
pnpm install
pnpm dev:web                # vite dev → http://localhost:5173
pnpm --filter @pinlay/web build
pnpm -r typecheck
```

Useful routes (all under the AppLayout shell unless noted):

- `/` — Pinboards (sessions feed, default landing)
- `/overview` — Dashboard placeholder
- `/integrations` — Integrations grid placeholder
- `/settings` — Settings placeholder
- `/s/:id` — Issue Detail (inside the shell, no StatusBar)
- `/gallery` — standalone design-system check page
- `/palette` — standalone palette board (internal tool)

---

## 6b. Deploying the web app (Vercel)

`apps/web` deploys **independently** from the monorepo — the api ships
separately to its own host. Config lives in [`apps/web/vercel.json`](apps/web/vercel.json)
so it travels with the app if web is later extracted to its own repo.

**Why it's wired the way it is.** `@pinlay/design` and `@pinlay/shared` are
**source-only "just-in-time" packages** — their `package.json` `exports` point at
`./src/*` (`.vue` / `.ts`), with no build step or `dist/`. So `@pinlay/design` is
never built on its own; Vite (via `@vitejs/plugin-vue`) **compiles its SFCs into
the web bundle at build time**. The UI is referenced from physical files two
levels up (`../../packages/design/src`), via both the Vite `@ui` alias and the
Tailwind `@source` directive in `main.css`.

**Vercel project settings (cannot live in `vercel.json` — set in the dashboard):**

1. **Root Directory = `apps/web`** (where the `vercel.json` is found).
2. **"Include files outside the Root Directory in the Build Step" = ON.** ⚠️
   Make-or-break: the build reads `../../packages/design/src`, so those files must
   exist in the sandbox. A disabled toggle here is the classic
   `Cannot find module '@pinlay/design'` failure.
3. Env var **`ENABLE_EXPERIMENTAL_COREPACK=1`** so Vercel honors the
   `packageManager: pnpm@10.12.1` pin and the pnpm-10 `onlyBuiltDependencies`
   config (otherwise it may install with a different pnpm major).

**What `vercel.json` sets:**

- `installCommand: pnpm install --filter @pinlay/web...` — installs only web +
  its workspace deps; skips api's native deps (`prisma`, `bcrypt`, `@nestjs/*`).
  Still creates the `workspace:*` symlinks to design/shared.
- `buildCommand: vite build` — **deliberately not** `pnpm build`. The build script
  is `vue-tsc --noEmit && vite build`, and `vue-tsc` follows imports into
  `@pinlay/design/src`, so a type error anywhere in the design package would fail
  the web deploy. Keep `vite build` for resilient deploys and run `vue-tsc` in CI.
  (Switch to `pnpm build` if you want typecheck-gated deploys.)
- `rewrites: /(.*) → /index.html` — SPA fallback. The router uses
  `createWebHistory()`, so deep links (`/s/:id`, `/settings`) 404 on refresh
  without it. Static assets are served first; only unmatched paths fall through.

**Production API URL (not handled here — do this when mocks are swapped for real
calls).** The `/api` → `localhost:8787` proxy in `vite.config.ts` is **dev-only**.
Since web and api deploy separately, prod web must call the api by **absolute URL**
via an env var (e.g. `VITE_API_URL`), not `/api`. Today the dashboard runs on mock
data (`shared/lib/data.ts`), so this is dormant — wire the env var when you replace
the mocks, or prod web will hit `/api` on its own domain and get the SPA-fallback
HTML instead of JSON.

**Splitting web into its own repo later.** The only thing crossing the web↔api
boundary is `@pinlay/shared` (the zod/types contract); `@pinlay/design` is shared
with the extension, not the api. To split: publish `@pinlay/shared` (and
`@pinlay/design`, shipping a compiled `dist/` for external consumers) to a
registry, flip the `workspace:*` deps to versioned ranges, and simplify
`installCommand` back to `pnpm install`. The `vercel.json` already moves with it.

---

## 7. What's next (in priority order)

1. **`apps/api`** — the backend the dashboard already expects.
   **NestJS + Prisma + Postgres** (per `specs/BACKEND_SPEC.md`; the original
   Hono/Workers/Drizzle plan was dropped — see the stack note in that spec).
   Scaffolded with `auth` + `annotation` (sessions/pins) + `attachments` +
   `health` modules. Plug into the existing composables — replace the mock in
   `shared/lib/data.ts` with `fetch('/api/sessions')` etc. (vite already proxies
   `/api`).
2. **`packages/inject`** — the page-side runtime that the extension's content
   script (and any future embed) loads into the host page. Single source of
   truth for pin-placement logic, anchor resolution, and DOM observers. Lives
   here so both `apps/extension` and any in-product widget can consume it
   without going through the extension surface. Folder is reserved.
3. **`apps/extension`** — port from DevProbe's working `apps/extension/` per
   `specs/EXTENSION_SPEC.md`. Manifest v3, shadow-DOM UI styled from
   `@pinlay/design`'s `tokens.css`, content script delegates DOM work to
   `@pinlay/inject`. Folder is reserved.
4. **New Session modal** on Pinboards — URL input, pinboard select, default
   integration, deep-links the extension into annotation mode. Wires to
   `POST /sessions` once the API exists.
5. **Command palette (⌘K)** in the StatusBar — fuzzy over sessions/pins/URLs/
   nav. Reka-ui has Combobox primitives; or roll a small one on Popover.
6. **Polish placeholders** — flesh out Dashboard (analytics KPIs/charts),
   Integrations (slide-over config), Settings sections that still mock.

---

## 8. Open questions for the owner

1. Keep the bundle label **"Pinboards"** for the sessions feed, or rename to
   **"Sessions"**?
2. Same backend as a shared service, or a fresh `@pinlay/api` instance?
   (Code currently assumes a fresh, pinlay-owned API.)
3. Activity thread + ReplyBox: real-time (websocket) or polling for v1?

---

## 9. Gotchas worth knowing

- shadcn-vue's `components.json` rejects the `tsx` key — it's only
  `typescript: true`.
- The CLI's latest registry imports icons from `@lucide/vue`; we use
  `lucide-vue-next` — run a `perl -pi` repoint after any `shadcn-vue add`.
- `tw-animate-css` is imported in `main.css` (needed for shadcn animation
  utilities `data-[state=open]:animate-in` etc.).
- The Vite dev server can serve stale Tailwind CSS for arbitrary `color-mix`
  classes after many hot edits — when in doubt, restart it.
- `colorhunt.co` returns 403 to WebFetch — pick palettes from memory or paste
  hexes.
