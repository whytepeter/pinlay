# General Spec

## 1. Summary

pinLayer turns scattered "this looks wrong" feedback into structured, anchored,
route-able issues. A user opens any web page with the pinLayer extension, clicks
an element, writes a short note, and that note becomes a **pin** — attached to a
real DOM element, carrying a severity, type, screenshot, and status. Pins from
one sitting roll up into a **session**, and sessions surface in the web dashboard
where teams triage, comment, and sync them to Linear / Jira / GitHub.

**Core promise:** _Capture once on the live page. Anchor it precisely. Route it
automatically. Verify the fix confidently._

This is **not** a screen recorder and not a heavyweight bug tool. It is a precise,
lightweight annotation layer. Keep it fast and keep it simple.

## 2. Personas

| Persona | Primary job | What they need from pinLayer |
|---|---|---|
| Designer | Review implementation vs. design | Drop pins fast, attach screenshots, compare to Figma |
| QA Engineer | Run structured passes | Create 10–20 pins per session without jank, track status |
| Product Manager | Leave UX / copy feedback | Pin without needing Jira access; group by page |
| Developer | Fix and verify | See open pins overlaid on the live page; update status; jump to anchor |
| Support Agent | Capture customer reports | Pin the exact broken element with context |

## 3. Monolithic architecture

One repository, three deployables, shared packages. Mirrors DeveProbe.

```
pinlayer/
├── apps/
│   ├── app/            # Web dashboard — Vue 3 + Vite (feature structure)
│   └── extension/      # Browser extension — WXT + Vue 3
├── packages/
│   ├── api/            # Backend — Hono on Cloudflare Workers
│   ├── shared/         # Shared TS types, zod schemas, enums
│   └── design/         # Design tokens + shared UI components (built from scratch)
├── specs/              # ← you are here
├── pnpm-workspace.yaml
└── package.json
```

- **`apps/app`** — the dashboard. Feature-based folders (see WEB_APP_SPEC). This is
  the primary build target for the first milestone.
- **`apps/extension`** — the capture surface (see EXTENSION_SPEC). Can be stubbed
  early; the dashboard is usable against seeded/mock data first.
- **`packages/api`** — Hono + Drizzle + Neon + R2 + Queues (see BACKEND_SPEC).
- **`packages/shared`** — the contract between app, extension, and api. Enums and
  zod schemas live here once and only once.
- **`packages/design`** — CSS token file + reusable components. The single source
  of visual truth (see DESIGN_SYSTEM_SPEC).

> **Naming:** packages are scoped `@pinlayer/*` (`@pinlayer/app`,
> `@pinlayer/extension`, `@pinlayer/api`, `@pinlayer/shared`, `@pinlayer/design`).

## 4. Tech stack

| Concern | Choice |
|---|---|
| Web framework | Vue 3 + Vite |
| Styling | **Tailwind v4** (CSS-first config) + CSS variable tokens |
| Components | Built from scratch into `@pinlayer/design` (no shadcn dependency) |
| Routing | Vue Router 4 (lazy routes + auth guard) |
| Client state | Pinia (+ persistedstate for auth/prefs) |
| Server state | @tanstack/vue-query |
| Icons | In-house icon set (lucide-style, 1.5px stroke — see design bundle `icons`) |
| Fonts | Geist Sans + Geist Mono |
| Extension | WXT + Vue 3, shadow-DOM overlays |
| Backend | Hono on Cloudflare Workers |
| DB / ORM | Neon Postgres + Drizzle |
| Storage | Cloudflare R2 (screenshots, clips) |
| Async | Cloudflare Queues (AI, dedupe, integration sync, notifications) |
| Auth | JWT (jose), bcrypt password hashing |

> **Tailwind v4 note:** there is no `tailwind.config.ts` content array the v3 way.
> Configure via `@import "tailwindcss"` and `@theme` in CSS. Tokens are CSS custom
> properties; Tailwind utilities reference them. See DESIGN_SYSTEM_SPEC §Tailwind.

## 5. Core domain concepts

- **Pin** — one anchored comment on a page element. Has severity, issue type,
  status, optional screenshot, assignee, and an **anchor** (how to re-find the
  element later).
- **Session** — all pins from one sitting on one URL. The dashboard's primary unit
  (a 14-pin checkout review is one session card, not 14 rows). Identified like
  `PL-0142`.
- **Anchor** — the resilient locator for a pinned element (selector + xpath + text
  fingerprint + bounding box…). When it can't be re-resolved, the pin is **stale**.
- **Pinboard** `[v1]` — a saved grouping of sessions by area (e.g. "Checkout
  funnel", "Marketing site"). Used for navigation and reporting.
- **Integration** — a connected tool (Linear, Jira, GitHub…) that pins sync to.

## 6. MVP scope

**In `[MVP]`:**

- Auth (login / signup).
- Dashboard shell: sidebar + top status bar.
- **Pinboards page** — the sessions feed (card grid + compact list, filters,
  search, empty state, new-session modal). This is the day-to-day triage surface.
- **Issue Detail** — pin list + pin detail (comment, screenshot, anchor block,
  activity thread, reply box, J/K navigation, resolve/status/assignee).
- **Integrations hub** — grid of connectors with connected/not-connected states.
- Light theme as default; theme + accent swap available but not prominent.
- Wired to `@pinlayer/api` for sessions, pins, and auth.

**`[v1]`:**

- **Dashboard / Overview** analytics page (KPIs, activity chart, pin hotspots,
  top pages, team leaderboard). Rich but non-essential — ship after triage works.
- Pinboards as first-class saved boards.
- Settings page (workspace, team, extension connect, notifications).
- Bulk actions on sessions.

**`[later]`:**

- Real-time collaborative annotation (WebSockets / Durable Objects).
- AI: auto-title, severity suggestion, duplicate detection, session summary.
- Public share links for a session or single pin.
- Command palette (⌘K).
- Visual-regression compare; accessibility-audit pins.

## 7. Non-goals

- Not a screen recorder (no console/network timeline capture in annotation mode).
- Not a full project-management tool — it routes to one, it doesn't replace it.
- No marketing-site fluff inside the app. Copy is written for technical users.

## 8. Glossary

- **Capture** — the act of dropping a pin via the extension.
- **Developer overlay** — extension mode that renders existing open pins on the
  live page so a dev can see and resolve them in context.
- **Grouped model** — sessions contain pins; one session = one dashboard issue.
- **Stale anchor** — a pin whose element can't be located on the current DOM.
- **Sync** — pushing a pin/session to an integration and reflecting its state back.

## 9. Roadmap (phases)

1. **Foundation** — monorepo, `@pinlayer/design` tokens + base components, app
   shell, auth.
2. **Triage** — Pinboards feed + Issue Detail, wired to API. (Core MVP value.)
3. **Connect** — Integrations hub + sync pipeline.
4. **Insight** — Overview analytics, Pinboards-as-boards, Settings.
5. **Capture** — extension flows polished end-to-end.
6. **Scale** — realtime, AI assists, public links, command palette.
