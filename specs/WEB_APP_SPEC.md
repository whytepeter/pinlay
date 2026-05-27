# Web App Spec (`apps/web`)

The dashboard — the command center where teams triage sessions, drill into pins,
and manage connectors. Vue 3 + Vite + Tailwind v4. **Simple UI, light-first.**

## 1. Feature structure

Mirrors DeveProbe: each feature is a self-contained folder (page + components +
composables). `pages/` holds thin route stubs; `features/` holds the real code;
`shared/` holds cross-feature primitives.

```
apps/web/src/
├── main.ts                     # boot: theme → pinia → router → vue-query → mount
├── App.vue                     # <RouterView/>
├── app/
│   └── router.ts               # routes + auth guard
├── assets/
│   └── main.css                # @import tailwind + tokens + fonts
├── features/
│   ├── workspace-shell/
│   │   ├── AppLayout.vue        # sidebar + StatusBar + <RouterView/>
│   │   └── components/
│   │       ├── AppSidebar.vue   # brand, workspace switcher, nav, pinboards, extension CTA, user
│   │       ├── StatusBar.vue    # top thin bar: sync state, theme toggle, shortcuts hint
│   │       └── WorkspaceSwitcher.vue
│   ├── auth/
│   │   ├── auth.store.ts
│   │   └── components/{LoginForm,SignupForm,AuthLayout}.vue
│   ├── pinboards/               # the sessions feed (primary surface)
│   │   ├── PinboardsPage.vue
│   │   ├── composables/{useSessions,useSessionSelection}.ts
│   │   └── components/
│   │       ├── SessionFilters.vue
│   │       ├── CardGrid.vue + SessionCard.vue
│   │       ├── CompactList.vue + SessionRow.vue
│   │       ├── BulkBar.vue
│   │       ├── NewSessionModal.vue
│   │       └── EmptyState.vue
│   ├── issue/                   # session/pin detail
│   │   ├── IssuePage.vue
│   │   ├── composables/{useSession,usePins,usePinMutations}.ts
│   │   └── components/
│   │       ├── PinList.vue + PinListItem.vue
│   │       ├── PinDetail.vue
│   │       ├── ScreenshotViewer.vue
│   │       ├── AnchorBlock.vue
│   │       ├── ActivityThread.vue + ActivityItem.vue
│   │       └── ReplyBox.vue
│   ├── dashboard/               # [v1] analytics overview
│   │   ├── DashboardPage.vue
│   │   └── components/{KpiCard,ActivityChart,PinHotspots,TopPagesList,TeamLeaderboard,SectionCard}.vue
│   ├── integrations/
│   │   ├── IntegrationsPage.vue
│   │   └── components/{IntegrationCard,IntegrationConfigPanel}.vue
│   └── settings/                # [v1]
│       └── SettingsPage.vue
├── shared/
│   ├── components/             # the @pinlay/design re-exports used app-wide
│   ├── composables/useTheme.ts
│   └── lib/{api.ts,format.ts,utils.ts,data.ts}
└── pages/                      # thin route stubs that import features
```

## 2. Routing

| Path | Page | Auth | Notes |
|---|---|---|---|
| `/login`, `/signup` | Auth | public | redirect to `/` if already authed |
| `/` | Pinboards (sessions feed) | required | **default landing** `[MVP]` |
| `/overview` | Dashboard analytics | required | `[v1]` |
| `/s/:id` | Issue Detail | required | `s` = session |
| `/integrations` | Integrations | required | |
| `/settings` | Settings | required | `[v1]` |
| `*` | Not Found | public | |

Lazy-load route components. A `beforeEach` guard checks the auth store (hydrated
before mount) and routes unauthed users to `/login`.

> Note: nav labels the sessions feed "Pinboards" and analytics "Dashboard", per
> the design bundle. The default landing is the sessions feed because triage is
> the core daily job.

## 3. App shell (`workspace-shell`)

**AppSidebar** (224px, collapsible to 64px, drawer on mobile):
brand + version → workspace switcher → search (`⌘K`) → nav (Dashboard, Pinboards,
Integrations, Settings) → Pinboards quick-list `[v1]` → Extension CTA card
(connection status, "Open extension") → user row.
Active item: accent left-bar + `--bg-2` background + accent icon.

**StatusBar** (40px, sticky): hamburger, "All systems normal", last-sync time,
"N teammates pinning", spacer, shortcut hint (`G then D/I/S`), theme toggle,
notifications bell. Shown on all pages except Issue Detail.

## 4. Pinboards page `[MVP]` — the sessions feed

The day-to-day triage surface. "Every annotation session, grouped by page."

- **PageHeader:** title "Pinboards", `{open} open` badge, subtitle; right side:
  empty-state toggle (dev), "Sync now", **"New session"** primary (`N`).
- **Filter bar:** status `Segmented` (All / Open / In progress / Resolved with
  counts) · divider · Severity / Type / Assignee `FilterDropdown`s · spacer ·
  `SearchInput` (filter by title or URL, `/`) · Sort dropdown · grid/list toggle.
- **Content:** `CardGrid` (default) or `CompactList`, or `EmptyState`.

**SessionCard** (`minmax(380px,1fr)` grid):
- 3px left bar colored by top severity.
- Header: hover/selected checkbox · `Favicon` · mono `PL-0142` · mono URL · `StatusChip`.
- Title (2-line clamp).
- `SeverityHeatbar` (proportional bar + counts).
- Footer (subtle tint, top border): reporter `Avatar` + first name + `· ago` ·
  `N pins` mono badge · `SyncChip`.
- Hover: lift `-1px`, border-strong, background → `--bg-elev`. Click → `/s/:id`.

**CompactList:** card-wrapped table; columns ID · Title (favicon) · URL · Pins ·
Severity · Reporter · Synced · Status · chevron; 2px severity left-bar per row;
row checkbox; click → detail.

**BulkBar** (when ≥1 selected, floats bottom-center offset by sidebar): `N selected`
· Assign · Change status · Send to… · Export · Delete (critical) · clear `X`. `[v1]`

**NewSessionModal:** URL input (globe icon), Pinboard select, Default integration
select, an info note ("extension switches focus to a new tab"), Cancel / "Launch
session". Deep-links the extension to the URL in annotation mode.

**EmptyState:** pin SVG with accent glow, "No annotation sessions yet", Install /
Watch-demo CTAs, and a 3-step strip (Install → Annotate → Ship).

## 5. Issue Detail page `[MVP]` — `/s/:id`

Full-height, **no StatusBar**. Own top header.

- **Header:** menu · "← Issues" · `›` · mono session id · `Favicon` + session title
  (truncates) · Copy link · Export PNG · "View in {integration}" · **"Open on page"**
  primary.
- **Body:** two columns desktop; stacked w/ "Pins" toggle ≤900px.

**Left rail (340px) — PinList:**
- Session meta: globe + mono URL + open-URL button; reporter avatar/name · ago ·
  `StatusChip`.
- Filter row: `{n} pins` · Sort: Severity · filter icon.
- Scroll list of **PinListItem**: `PinPill #NN` (sm) · 2-line title · row of
  `SeverityDot` + `TypeChip` + stale warning + assignee avatar. Active item:
  accent left-border + `--bg-2`.
- Footer: "Add comment to session".

**Right — PinDetail:**
- Sticky header (blur): `PinPill` · `SeverityChip` · `TypeChip` · stale badge ·
  spacer · `K / J` prev-next with `idx/total` · assignee picker · status picker ·
  **Resolve** primary. Then the pin title (h2, 19px).
- Body (max 820px): comment text → **ScreenshotViewer** → **AnchorBlock** →
  **ActivityThread** → **ReplyBox**.

**ScreenshotViewer:** framed screenshot with faux browser chrome, the pinned
element outlined (dashed accent), an overlaid pulsing pin marker; caption with
capture meta + download. Click → lightbox. (Real screenshots replace the mock.)

**AnchorBlock:** collapsible. Header: cursor icon (accent / stale-orange) · "Anchor"
· mono selector (truncated) · "Resolves ✓" or "Element not found ⚠" · chevron.
Expanded grid: Tag, CSS selector, XPath, Text fingerprint, Bounding box, Captured.

**ActivityThread:** vertical timeline. Comment items render as bordered cards
(author + time + body); system items (pinned, sync, assign, status) render inline
with an avatar or a sync glyph node.

**ReplyBox:** avatar + textarea ("Reply, mention @teammates…"); toolbar (attach,
mention, code), "Markdown supported · ⌘↵ to send", Send (primary when non-empty).

**Keyboard:** `J/↓` next pin, `K/↑` prev pin (ignored while typing).

## 6. Integrations page `[MVP]`

- **PageHeader:** "Integrations" + "Connect your stack".
- Sections by category: Issue Trackers, Messaging, Design, Documentation, Developer.
- **IntegrationCard:** gradient glyph tile · name · category · status row
  (connected → green dot + account + "Configure"; else gray dot + "Connect").
  Hover lift.
- **IntegrationConfigPanel** `[v1]`: right slide-over — field mappings
  (severity→priority, type→label), sync direction, last-sync, Disconnect (bottom).

See INTEGRATIONS_SPEC for behaviour.

## 7. Dashboard / Overview `[v1]` — `/overview`

Analytics. KPI strip (Total pins, Open, Critical, Avg time-to-fix) · "Pin activity"
area chart (created vs resolved) · "Pin hotspots" scatter (page × day × volume ×
severity) · split: "Top pages by pin volume" + "Team contributions". Rich, but not
required for triage — keep it out of MVP.

## 8. Settings `[v1]`

Sections: Workspace (name, logo, plan) · Extension (install links, connection
token, active tabs) · Team (members, roles, invite) · Notifications (per-event
rules) · Security (SSO, sessions) · Danger zone (delete, typed confirm).

## 9. State & data

- **Pinia:** `auth` (user, token, hydrate, login/logout — persisted), `prefs`
  (theme, accent, density, view — persisted).
- **vue-query:** all server reads (`useSessions`, `useSession`, `usePins`,
  `useIntegrations`) and writes (`usePinMutations` → status/assignee/resolve;
  `useSessionSubmit`). `staleTime 30s`, `gcTime 5m`, no refetch-on-focus, retry 1.
- **Mock-first:** `shared/lib/data.ts` seeds PEOPLE / SESSIONS / PINS / INTEGRATIONS
  (from the design bundle) so the UI is fully buildable before the API exists.
  Swap the data source behind the composables, not in the components.

## 10. Cross-cutting UI states

Every list/detail must define: **loading** (skeletons, never spinners-only),
**empty** (purposeful, with a next action), **error** (inline, retryable). Toasts
for mutations `[v1]`. Optimistic status/assignee updates with rollback on failure.
