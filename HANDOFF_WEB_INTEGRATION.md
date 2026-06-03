# Handoff — Web App Integration

> Scope: wire `apps/web` to the real backend, replacing mock composables one
> domain at a time. The API is live and verified; the web client is wired but
> only used by auth today. Everything else still reads from
> `shared/lib/data.ts` mocks.

_Last updated: 2026-06-01 (phases 1, 4, 5 landed)_

## TL;DR for the next session

1. The API surface you'll consume is **done and verified** (workspace, issues, members, auth).
2. The web client (`apiClient`) is **done and verified for auth**; it has typed methods for issues + workspace members, but **no consumer in views yet**.
3. **TanStack Query is installed + configured** with sensible defaults — use `useQuery` / `useMutation` for all new wiring; don't roll bespoke loading state.
4. **Start with the workspace switcher** (highest user impact, smallest change, pattern already exists in the extension popup), then settings, then the issues feed.
5. Do **NOT** touch dashboard analytics — `[v1]`, not on the table.

---

## State today (be honest)

### What's wired to real API
- `useAuth.ts` (`shared/composables/`) — login, signup, hydrate, `/auth/me` revalidate, persisted token, route guard. Done.
- `ConnectExtensionView.vue` — the popup's "Connect" landing page. Done.
- `apiClient` (`shared/lib/api.ts`) — typed methods for: `login`, `signup`, `me`, `workspaceMembers`, `issues.{list,get,pins}`. Auth bearer auto-attached via `setApiToken`.

### What still uses mocks
| Surface | Composable | Mock source | API to wire |
|---|---|---|---|
| ~~Sidebar workspace switcher~~ | ✅ wired to `GET /workspaces` + `POST /workspaces/:id/switch` (2026-06-01). Token swap via `useAuth.setToken`. Create-workspace dialog removed pending `POST /workspaces`. |
| Settings → Profile | `useSettings().profile` | `PEOPLE[0]` from `data.ts` | `GET /auth/me`, `PATCH /auth/me` *(not built yet — see "API gaps")* |
| Settings → Workspace | `useSettings().workspace` | `reactive({name, slug, plan, …})` | `GET/PATCH /workspaces/current` |
| Settings → Members | `useSettings().members` | hardcoded `ref<Member[]>` | `GET /workspaces/members`, `POST invite`, `PATCH role`, `DELETE` |
| Settings → Notifications | `useSettings().notifications` | `reactive(…)` | **API missing** — defer |
| Settings → Billing | `useSettings().setPlan` | sets `workspace.plan` locally | `PATCH /workspaces/current` (plan field) + Stripe later |
| ~~Pinboards feed (`/`)~~ | ✅ wired to `GET /issues` via `useQuery` (2026-06-01). Server-side `status`+`q`, client-side severity/assignee. Cards now consume `IssueSummary` directly via `shared/lib/issue-display.ts`. Assignee dropdown reads `/workspaces/members`. |
| ~~Issue detail (`/s/:id`)~~ | ✅ wired to `GET /issues/:id` (2026-06-01). Embeds pins in one round-trip. Detail components consume `ApiPin` directly (`comment`→body, `author`/`assignee` MemberRef). Assignee dropdown reads `/workspaces/members`. Pin status/assignee mutations are LOCAL-ONLY for now — wire `PATCH /annotation/pins/:id` when the action surface is needed. ActivityThread shows only pinned/assignee (no activity API yet). |
| Sidebar boards | `useBoards()` (`shared/composables/`) | local `ref<Board[]>` | **API missing** — boards/ module not built. Board filter on feed is now a no-op against real data. |
| Integrations | `useIntegrations()` | hardcoded array | **API missing** — Roadmap Phase 3 |

### Infrastructure already in place (don't re-do)
- **TanStack Query** (`@tanstack/vue-query`) — plugged in via `main.ts`. Defaults in `shared/lib/query-client.ts`: `staleTime 30s`, `gcTime 5m`, no refetch-on-focus, retry 2× with exponential backoff but **no retry on 4xx** (auth/validation are permanent).
- **`QueryList.vue`** and **`DetailsList.vue`** (`shared/components/`) — generic query-bound list + detail shells with built-in loading/error/empty states. Use these.
- **`ApiError`** class — surfaces HTTP status on `.status`. Catch it to distinguish 401 (re-login) from 5xx (transient).
- **Auth guard** — every non-public route bounces to `/login?redirect=…` if `!isAuthenticated`. Already enforced.
- **Vite proxy** — `/api/*` → `http://localhost:8787` in dev. Don't change.

---

## API surface available (verified live)

### Workspace (`apps/api/src/workspace/`)
```
GET    /api/workspaces             → Workspace[]   list mine (switcher)
GET    /api/workspaces/current     → Workspace     active ws (incl. memberCount + role)
PATCH  /api/workspaces/current     → Workspace     {name?, plan?} (admin only)
POST   /api/workspaces/:id/switch  → {token, workspace}  re-mints JWT — client must
                                                          replace stored token
DELETE /api/workspaces/current     → 204           owner only; cascades

GET    /api/workspaces/members     → Member[]
POST   /api/workspaces/members/invite     → Member  (admin only)
PATCH  /api/workspaces/members/:id        → Member  {role}
DELETE /api/workspaces/members/:id        → 204
```

`Workspace = { id, slug, name, plan, role, memberCount }`
`Member = { id, userId, name, email, avatarUrl, role, createdAt }`

### Issues (`apps/api/src/issues/`)
```
GET /api/issues?status=&pageUrl=&q=&limit=&offset=  → Paginated<IssueSummary>
GET /api/issues/:id                                 → IssueDetail (summary + pins[])
GET /api/issues/:id/pins                            → ApiPin[]
```

### Auth (`apps/api/src/auth/`)
```
POST /api/auth/{signup,login}  → AuthResult
GET  /api/auth/me              → Me
GET  /api/auth/workspace/members  → [DEPRECATED]  alias of /workspaces/members
```

---

## Recommended sequence

### 1. Workspace switcher in the sidebar (start here)
**Why first:** highest visible impact, smallest change, exact pattern already exists in `apps/extension/src/entrypoints/popup/App.vue` (lines that handle `loadWorkspaces`, `chooseWorkspace`, `switchWorkspace`).

- File: `apps/web/src/features/workspace-shell/components/WorkspaceSwitcher.vue`
- Current: hardcoded `workspaces` ref + `current` ref; "Create workspace" dialog is also mock.
- Wire:
  - On mount or on dropdown open → `useQuery(['workspaces'], () => apiClient.workspaces.list())`
  - Add `apiClient.workspaces.{list, current, switch, update}` to `shared/lib/api.ts` (the methods don't exist yet — types are easy to mirror from the extension's `lib/api.ts`).
  - On select → `useMutation(({id}) => apiClient.workspaces.switch(id))`; on success: call `useAuth().setToken(res.token)` (you'll need to add a small helper to `useAuth` to swap the token), invalidate all queries (`queryClient.clear()` or selectively), navigate to `/`.
  - "Create workspace" Dialog → leave mocked OR remove for now (no `POST /workspaces` endpoint yet — that's a separate API gap).
- **Token-swap on switch is the only tricky bit**: the server returns a new JWT bound to the new workspace. The client must replace `localStorage["pl_token"]` AND call `setApiToken()` so subsequent requests carry the new token. The extension already does this — mirror it.

### 2. Settings → Workspace section
- File: `apps/web/src/features/settings/components/WorkspaceSection.vue`
- Current: reads `useSettings().workspace` (mock), `updateWorkspace(next)` mutates the local reactive object.
- Wire:
  - Query: `useQuery(['workspace', 'current'], () => apiClient.workspaces.current())`
  - Mutation: `useMutation((dto) => apiClient.workspaces.update(dto))` → on success: `invalidateQueries(['workspace', 'current'])` and `['workspaces']` (so the sidebar reflects the rename).
  - **Don't touch `useSettings` yet** — it's a junk-drawer composable that bundles 5 concerns. The clean refactor: split it into `useWorkspace`, `useProfile`, `useMembers`, `useNotifications`. Do that opportunistically as you wire each section.

### 3. Settings → Members section
- File: `apps/web/src/features/settings/components/MembersSection.vue`
- Current: reads `useSettings().members`, all mutations local.
- Wire:
  - Query: `useQuery(['workspace', 'members'], () => apiClient.workspaces.members())`
  - Invite: `useMutation(({email, role}) => apiClient.workspaces.invite({email, role}))` → invalidate `['workspace', 'members']`.
  - Role change: `useMutation((id, role) => apiClient.workspaces.updateMember(id, {role}))`
  - Remove: `useMutation((id) => apiClient.workspaces.removeMember(id))`
- **Server enforces**: admin-only for mutations; can't demote/remove the last owner (returns 403). Show those errors inline; don't optimistic-update destructive ops.
- **Pending status**: the spec'd "pending invite" status doesn't exist server-side yet. Today `POST invite` requires the invitee to already have an account (returns 404 otherwise). Surface that 404 with a friendly "No pinlay account with that email yet — email invites coming soon" message (the API already returns that text).

### 4. Pinboards feed (`/`)
- File: `apps/web/src/features/pinboards/PinboardsPage.vue` + `composables/useSessions.ts`
- Current: filters mock `SESSIONS` from `data.ts` in-memory.
- Wire:
  - Refactor `useSessions()` to return a `useQuery` driven by reactive filter refs:
    ```ts
    const params = computed(() => ({ status, q, limit, offset }));
    const query = useQuery({
      queryKey: ['issues', 'list', params],
      queryFn: () => apiClient.issues.list(params.value),
    });
    ```
  - `Paginated<IssueSummary>` returns `{ items, total, limit, offset }` — use it for paginated controls.
  - The list rows render via `SessionCard` / `SessionRow` — those still reference `SessionListItem` (the mock shape with `boardId`, `integration`, `reporter.avatarHue`). You'll need to either: (a) adapt `IssueSummary` → the existing card shape with a small mapper, or (b) update the cards to consume `IssueSummary` directly (cleaner, no shim). Recommended: option (b) — most fields map 1:1 (`title`, `pinCount`, `severityCounts`, `status`, `createdAt`). `reporter` is now `{id,name,email,avatarUrl}` not `avatarHue` — derive hue from `id` if needed.

### 5. Issue detail (`/s/:id`)
- File: `apps/web/src/features/issue/IssuePage.vue` + `composables/useIssue.ts`
- Current: `SESSIONS.find(id) + getPins(severityCounts)` mocks.
- Wire:
  - `useQuery({ queryKey: ['issue', id], queryFn: () => apiClient.issues.get(id) })` returns `IssueDetail` which already embeds `pins[]`. **One round-trip, not a waterfall** — don't fetch `/issues/:id/pins` separately; it's a fallback for partial loads.
  - For status/assignee/resolve mutations: the API doesn't have `PATCH /issues/:id` or pin-level mutations exposed yet under `/issues/*` — pin mutations are under `/annotation/pins/:id` (PATCH/DELETE). Use those.

---

## Patterns to follow (and break only with reason)

- **One composable per domain, not per page.** `useWorkspace`, `useMembers`, `useIssues`, `useIssue` — not `useSettings` (which we inherited). When you split the junk-drawer composable, document the migration in cerebrum so the next person doesn't re-bundle it.
- **vue-query for ALL server state.** No `ref + fetch` rolls. The retry/cache/refetch defaults are already right.
- **Mutations invalidate, don't manually re-fetch.** `queryClient.invalidateQueries(['workspace', 'members'])` after `inviteMember()`. Vue Query handles the rest.
- **Use `QueryList`/`DetailsList`** — generic shells with loading/error/empty already wired. Saves you re-doing skeletons per page.
- **Optimistic-update only safe writes.** Renames, status flips → optimistic. Deletes, role demotions → wait for server confirmation; 403s here are real (last-owner guard, admin-only).
- **`IssueSummary.id` is the cuid, `reference` is "PL-0042".** Routes use `id`; UI displays `reference`. Don't mix.

---

## Gotchas worth knowing

- **Token swap on workspace switch** — the new JWT must overwrite the old in `localStorage` AND `setApiToken()` must be called. The extension popup does this correctly; mirror it.
- **`useSettings` is a junk drawer** — bundles profile + workspace + members + notifications + plan. Split incrementally; don't touch the parts you're not wiring.
- **`shared/lib/data.ts` mocks** — keep this file intact during transition. Only stop *importing* from it as each composable gets wired. Delete the file in one PR at the end.
- **Boards** (`useBoards`) — no API exists for these yet. Leave as mock. The `?board=` filter on `/` is purely client-side today.
- **CORS** — `chrome-extension://*` is in the API's allowlist; the dashboard at `localhost:5173` is too. If you add a new origin, update `apps/api/.env` `CORS_ORIGINS`.
- **Node version** — this shell sometimes defaults to Node 16 (nvm); `nvm use 20` before `pnpm` against `apps/api`. The other apps don't care.
- **API runs from compiled dist in `start` mode**, source in `dev` mode. For dev, always use `pnpm dev:api`. The other session's seed user `you@pinlay.dev / pinlay-dev` is the dev account.

## API gaps to flag if you need them
Future modules that aren't built yet (don't surprise yourself):
- ~~`POST /workspaces`~~ ✅ (2026-06-02)
- ~~`PATCH /auth/me`~~ ✅ (2026-06-02)
- ~~Boards module~~ ✅ (2026-06-01)
- ~~Pending-invite flow~~ ✅ (2026-06-02) — invite model + accept-by-link + auto-accept-on-signup
- Notifications module entirely
- Integrations module entirely

### Email pipeline — **invite emails aren't sent yet**

The invite *flow* is complete (model, accept endpoints, dedicated accept
page at `/invite/:token`, signup-via-invite, auto-accept-on-signup-with-matching-email)
but no transactional email leaves the API. Admins copy the accept link via
the "Copy invite link" menu item on the pending row and share it manually
(Slack DM / paste / etc.).

To finish: pick a transactional provider (Resend / Postmark / SendGrid), add
`MAIL_*` env vars to `apps/api/config/env.ts`, write a thin `MailService`
that takes a typed payload and renders an HTML+text template (React Email
or MJML both fine), fire it from:
  - `WorkspaceService.inviteMember` (after creating the pending Invite row)
  - `WorkspaceService.resendInvite` (after regenerating token+expiry)
A queue isn't required for v1 — fire-and-forget with a `try/catch + warn`
is fine. Templates needed: **invite** + **invite-resent** (and later
**workspace-deleted / role-changed** if you want a notification surface).
The token to embed in the email is already in `InviteDto.token`; the URL is
`${WEB_APP_URL}/invite/${token}`.

Until that lands the manual-share path stays as the canonical UX — don't
pretend an email was sent when it wasn't.

If a gap blocks something you're building, flag it to the API session — don't paper over with mocks.

---

## Quick start

```bash
# Both servers
pnpm dev:api       # → http://localhost:8787 (NestJS watch)
pnpm dev:web       # → http://localhost:5173 (Vite)

# Login at /login with: you@pinlay.dev / pinlay-dev

# Verify API end-to-end before touching web code
B=http://localhost:8787/api
TOKEN=$(curl -s -X POST "$B/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"you@pinlay.dev","password":"pinlay-dev"}' | jq -r .token)
curl -s "$B/workspaces" -H "Authorization: Bearer $TOKEN" | jq
curl -s "$B/issues" -H "Authorization: Bearer $TOKEN" | jq '.items[0]'
```

If those return data, the API is fine — any wiring failure is on the web side.

---

## Cerebrum entries to read before touching things
- "API module structure (decided + started 2026-05-30)" — explains the workspace/ + issues/ + sessions→issues rename.
- "Real auth + extension connect flow (2026-05-30)" — explains `useAuth`, the route guard, token persistence.
- "Workspace switcher in the extension popup (2026-05-30)" — the exact pattern to mirror in `WorkspaceSwitcher.vue`.
- "URL normalization for pin matching (2026-05-30)" — explains `normalizeUrl` from `@pinlay/shared`, in case you need to canonicalize URLs in the dashboard.
- "@pinlay/shared now ships a dist" — conditional-exports setup, in case you import shared runtime code into the web.

## When you're done with a phase
- Append to `.wolf/memory.md` (one-liner)
- Update `.wolf/cerebrum.md` Key Learnings if you discovered a pattern
- Delete the corresponding row from the "still uses mocks" table at the top of this doc

Good luck. The hard architectural calls are made — this is mostly typing now.
