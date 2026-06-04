# Handoff — Web App Integration

> Scope: this doc is the contract between the API session and the web/UI
> session. It tracks what's wired, what's still mock, what each endpoint
> returns, and the conventions to follow when you wire something new.

_Last updated: 2026-06-03 — workspace/boards/invites/issues all wired end-to-end._

---

## TL;DR

The dashboard now drives the API live for every surface that ships an
endpoint — auth, workspace, members, invites, boards, issues, pins, comments,
labels are all real. **The dashboard + API are essentially done.**

The remaining web/API gaps are **not the next work** — per `ROADMAP.md` they
land at **Phase 3+** (integrations / Linear sync), **Phase 5** (billing, object
storage), or **Phase 6** (notifications), plus **pre-launch plumbing** with no
phase number (email pipeline, audit logging, throttle). The roadmap's actual
next work — **Phase 0** validation → **Phase 1** anchor moat → **Phase 2**
developer overlay — is *extension-side* and lives outside this doc. See
"Outstanding TODOs" for the full phase mapping.

The handoff structure below mirrors a typical session:
1. **State today** — what's wired vs what's mock.
2. **API surface** — every endpoint, grouped by module.
3. **Patterns** — the conventions to follow.
4. **Gotchas** — things that bit during this session.
5. **Outstanding TODOs** — remaining web/API work, mapped to roadmap phases.

---

## State today

### ✅ Wired to real API
| Surface | Composable / view | Endpoints |
|---|---|---|
| Login + signup | `useAuth.ts` | `/auth/login`, `/auth/signup`, `/auth/me`, `PATCH /auth/me` |
| Profile (Settings) | `ProfileSection.vue` | `GET /auth/me` + `PATCH /auth/me` |
| Workspace switcher | `WorkspaceSwitcher.vue` | `GET /workspaces`, `POST /workspaces`, `POST /workspaces/:id/switch` |
| Settings → Workspace | `WorkspaceSection.vue` | `GET/PATCH /workspaces/current` (name + slug) |
| Settings → Members | `MembersSection.vue` | `GET /workspaces/members`, invite/update/remove, `GET/POST resend/DELETE /workspaces/invites` |
| Settings → Danger Zone | `DangerZoneSection.vue` | `DELETE /workspaces/current` (owner-only) |
| StatusBar invite | `StatusBar.vue` | shares `POST /workspaces/members/invite` |
| Pinboards feed | `useSessions.ts` + `PinboardsPage.vue` | `GET /issues`, `GET /issues/counts`, all filters server-side, paginated |
| Issue detail | `useIssue.ts` + `IssuePage.vue` | `GET /issues/:id`, `PATCH /issues/:id` (board / status / title) |
| Pin mutations | `useIssue.ts` | `PATCH /annotation/pins/:id` (status / assignee / labels) |
| Pin comments | `ActivityThread.vue` | `GET/POST/PATCH/DELETE /annotation/pins/:id/comments[/:commentId]` |
| Boards (sidebar + assignment) | `useBoards.ts`, `AppSidebar.vue` | full CRUD under `/boards`; assignment via `PATCH /issues/:id` |
| Accept invite (public) | `AcceptInviteView.vue` (`/invite/:token`) | `GET /invites/:token`, `POST /invites/:token/accept[-with-signup]` |

### 🟡 Still mock
| Surface | Composable | Why |
|---|---|---|
| Settings → Notifications | `useSettings.ts` (junk-drawer) | API not built |
| Settings → Billing | `useSettings.ts` | needs Stripe |
| Integrations page | `useIntegrations.ts` | Roadmap Phase 3 |

### Infrastructure (don't re-do)
- **TanStack vue-query** plugged in via `main.ts`. Defaults in `shared/lib/query-client.ts`: `staleTime 30s`, `gcTime 5m`, no refetch-on-focus, retry 2× with exponential backoff but **no retry on 4xx**.
- **vue-sonner** mounted in `App.vue` with type-coloured left borders + close button. Wrapper in `shared/lib/toast.ts` (`toast.success/error/info/warn`).
- **`Skeleton`** primitive uses `bg-muted` (neutral). Dedicated skeletons exist for `SessionCard`, `SessionRow`, `IssuePage`, settings sections.
- **Auth guard** in `apps/web/src/app/router.ts` — every non-public route bounces to `/login?redirect=…`.

---

## API surface

All paths prefixed `/api`. Auth via `Authorization: Bearer <jwt>` unless flagged **public**.

### Auth (`apps/api/src/auth/`)
```
POST /auth/signup     → AuthResult        public; auto-accepts pending invites for the email
POST /auth/login      → AuthResult        public, 5/min/IP
GET  /auth/me         → Me
PATCH /auth/me        → Me                {name?, avatarUrl?} (null clears avatar)
```

### Workspaces (`apps/api/src/workspace/`)
```
GET    /workspaces                → Workspace[]           list mine, drives switcher
POST   /workspaces                → SwitchResult          create + auto-switch (admin? caller becomes owner)
GET    /workspaces/current        → Workspace             active ws (incl. memberCount + role)
PATCH  /workspaces/current        → Workspace             {name?, slug?, plan?} (admin only; slug uniqueness + reserved-list)
DELETE /workspaces/current        → 204                   owner only; cascades
POST   /workspaces/:id/switch     → SwitchResult          re-mints JWT bound to :id

GET    /workspaces/members        → MemberDto[]
POST   /workspaces/members/invite → InviteResult          discriminated: {kind:'member',member} | {kind:'invite',invite}
PATCH  /workspaces/members/:id    → MemberDto             {role}
DELETE /workspaces/members/:id    → 204

GET    /workspaces/invites              → InviteDto[]     pending only
POST   /workspaces/invites/:id/resend   → InviteDto       regenerates token + expiry
DELETE /workspaces/invites/:id          → 204             revoke (idempotent)
```

`Workspace = { id, slug, name, plan, role, memberCount }`
`InviteDto = { id, email, role, status, token, invitedBy, invitedAt, expiresAt }`

### Invite accept (public, `apps/api/src/workspace/invite-accept.controller.ts`)
```
GET  /invites/:token                       → PublicInvitePreview  public, 30/min/IP
POST /invites/:token/accept                → SwitchResult         authed; caller email must match
POST /invites/:token/accept-with-signup    → SwitchResult         public, 5/min/IP, body {name, password}
```

The accept-with-signup endpoint creates a User bound to the invite email and skips creating a personal workspace — the user lands in the invited workspace as primary. AuthService.signup also auto-accepts pending invites if a user signs up via the normal flow with a matching email.

### Issues (`apps/api/src/issues/`)
```
GET    /issues                  → Paginated<IssueSummary>  filters: status, severity, reporterId, boardId, q, pageUrl, includeArchived, limit, offset
GET    /issues/counts           → IssueCounts              {all, open, in_progress, resolved, archived} honouring non-status filters
GET    /issues/:id              → IssueDetail              summary + pins[]
GET    /issues/:id/pins         → ApiPin[]                 fallback for partial loads
PATCH  /issues/:id              → IssueSummary             {boardId?, title?, status?}
```

`IssueSummary` embeds `board: BoardRef | null` and `reporter: MemberRef | null`. Archived issues are hidden from the default feed; opt in via `?status=archived` or `?includeArchived=true`.

### Boards (`apps/api/src/boards/`)
```
GET    /boards                  → Board[]                  workspace-scoped, ordered by position
POST   /boards                  → Board                    admin; auto-slug from name with collision retry
PATCH  /boards/:id              → Board                    {name?, slug?, color?, position?}
DELETE /boards/:id              → 204                      issues stay (Issue.boardId SetNull)
```

### Annotation (extension write surface + dashboard reads)
```
POST   /annotation/pins                            → {pin, sessionId, issueId}
GET    /annotation/pins?pageUrl=                   → ApiPin[]
PATCH  /annotation/pins/:id                        → ApiPin   {status?, assigneeId?, labels?, severity?, issueType?, comment?, anchor?}
DELETE /annotation/pins/:id                        → {deleted:true}

GET    /annotation/pins/:id/comments               → PinCommentRow[]   oldest first
POST   /annotation/pins/:id/comments               → PinCommentRow     body 1-5000
PATCH  /annotation/pins/:id/comments/:commentId    → PinCommentRow     author-only
DELETE /annotation/pins/:id/comments/:commentId    → 204               author OR admin/owner

POST   /annotation/sessions/:id/submit             → Issue             extension finalises a sitting
```

### Attachments / Health
```
POST /attachments → AttachmentDto   inline base64 for v1
GET  /health      → {ok, db, latencyMs, uptime, version}
```

---

## Patterns to follow

- **One composable per domain, not per page.** `useAuth`, `useIssue`, `useSessions`, `useBoards`. `useSettings` is the legacy junk-drawer — don't extend it, split section-by-section as each domain gets wired.
- **vue-query for ALL server state.** No `ref + fetch`. The retry/cache defaults are already right.
- **Mutations invalidate, don't manually re-fetch.** `queryClient.invalidateQueries({ queryKey: [...] })` after a mutation; vue-query does the rest.
- **Optimistic update only for safe writes.** Title rename, status flip → optimistic. Deletes, role demotions, workspace switches → wait for server confirmation.
- **Dialogs stay open until the server acks.** Pattern: button shows `Sending…`/`Creating…` + spinner, all inputs disabled, close + reset ONLY on success. Errors keep the dialog open with the user's input. See `WorkspaceSwitcher`, `MembersSection`, `AppSidebar` (board create/edit), `StatusBar` (invite).
- **Skeletons mirror the real layout** so loading doesn't reflow. `SessionCardSkeleton`/`SessionRowSkeleton` for the feed; `IssuePageSkeleton` for the full detail; inline form-field skeletons for settings.
- **Toasts for transient state, inline copy for terminal state.** Errors that should auto-dismiss → `toast.error(err)`. Permanent "not found" / "couldn't load" → inline.
- **Reka portal `to=` in shadow-DOM only.** This isn't a concern in the web app (the design-package primitives use plain Reka portals against `document.body`); only matters in the extension where the same components mount in a shadow root.

---

## Gotchas worth knowing (from this session)

- **Token swap on workspace switch / create.** Both `/switch` and `POST /workspaces` re-mint a JWT bound to the target workspace. The web client calls `auth.setToken(token, {id, role})` then `queryClient.removeQueries({ predicate: q => q.queryKey[0] !== 'workspaces' })` — note the predicate: we DROP every other cache but KEEP the workspaces query observer alive so a `setQueryData` afterwards reaches the dropdown. **Don't replace this with `queryClient.clear()`** — it unsubscribes the workspaces observer and the seeded data never paints.
- **`queryClient.clear()` unsubscribes existing observers.** Use `removeQueries({predicate})` when you need to keep one query alive.
- **vue-query's cached data is readonly.** `useIssue` deep-clones pins into a local ref so optimistic mutations (status / assignee / labels) don't trigger Vue's "Set on readonly proxy" warnings. If you add a new composable that mirrors server data for optimistic edits, clone before assigning.
- **Reka DropdownMenuTrigger needs a real PointerEvent in synthetic tests.** Native `click()` doesn't open the menu. Use `dispatchEvent(new PointerEvent('pointerdown', {pointerType: 'mouse', isPrimary: true}))` + `pointerup` + `click`. Real browser clicks are unaffected.
- **Forward-ref circular dep between Auth + Workspace.** AuthModule imports WorkspaceModule (for invite auto-accept) and WorkspaceModule imports AuthModule (for JwtAuthGuard + signToken). Both ends use `forwardRef(() => Other)` in `imports`, and the service constructor injecting across the cycle MUST also use `@Inject(forwardRef(() => Other))`. See `AuthService` and `WorkspaceService`.
- **`issue.author` IS the reporter** in IssueSummary (we just label it that way for the UI). API field is `authorId` on the DB; serializer renames it to `reporter` because `author` is more confusing in a dashboard context.
- **Prisma `migrate dev` is interactive and hangs in this shell.** Always hand-write `prisma/migrations/<timestamp>_<name>/migration.sql` + `prisma migrate deploy`. Last three migrations followed this pattern: `20260601160000_boards`, `20260602180000_invites`, `20260603020000_pin_comments`.
- **`PinComment` doesn't carry workspaceId.** Scoping is transitive (pin → session → workspace). The service's `assertPinInWorkspace` walks that path; don't optimise to a direct `workspaceId` join.
- **`includeArchived` is a query STRING** (`"true"`) not a boolean — class-validator's `@IsBooleanString()` parses it. Counts endpoint always passes `includeArchived=true` server-side because we want the full breakdown regardless of the caller's view.
- **bcrypt hashing is exposed via `AuthService.hashPassword(...)`** so other modules (e.g. `WorkspaceService.acceptInviteWithSignup`) can hash without importing bcrypt + duplicating the rounds config.
- **Issue tab counts can drift from feed totals when filters are applied.** `IssueCounts.all` excludes archived; the badge in PageHeader uses `total` (which respects ALL filters). Don't try to make them match — they answer different questions.
- **`useIssue` returns `setStatus` for pin-level status.** If IssuePage also needs an issue-level setStatus (it does now), name the local one `setIssueStatus` to avoid the collision. Same gotcha applies to any future per-pin vs per-issue mutation pair.

---

## Outstanding TODOs (mapped to the roadmap)

> Slotted into `ROADMAP.md` phases, not raw leverage. **Read this first:** the
> roadmap's actual next work — **Phase 0** (validation, no code) → **Phase 1**
> (anchor moat) → **Phase 2** (developer overlay) — is *extension-side* and does
> **not** appear in this doc. The dashboard + API are essentially done.
> Everything below lands at **Phase 3 or later**, plus pre-launch plumbing that
> has no phase number. **None of it is the wedge** — don't let the length of this
> list pull effort away from the anchor + overlay work.

### Pre-launch plumbing — no roadmap phase (gating, not differentiating)

**Email pipeline — invite emails aren't sent yet.** The whole invite flow (model, accept endpoints, accept page, signup-via-invite, auto-accept-on-signup) is **complete** but **no email actually leaves the API**. Admins currently use the "Copy invite link" menu item on the pending row and share the URL manually (Slack DM / paste / etc). Fine through Phase 0 user tests — not a blocker.

To finish: pick a transactional provider (Resend / Postmark / SendGrid), add `MAIL_*` env vars to `apps/api/src/config/env.ts`, write a thin `MailService` (typed payload + HTML+text template via React Email or MJML), fire it from `WorkspaceService.inviteMember` (after creating the pending Invite row) and `WorkspaceService.resendInvite` (after regenerating). The token is in `InviteDto.token`; the URL is `${WEB_APP_URL}/invite/${token}`. Fire-and-forget with a try/catch + logger.warn is fine for v1 — no queue required. Templates: **invite** + **invite-resent**.

- **Email verification on signup** + **password reset flow** — both gated on the email pipeline above.
- **Audit logging** on auth events (login/signup/password-change/workspace-delete). Pre-launch hardening.
- **Per-account login throttle** (today's throttle is per-IP only). Mitigates credential stuffing from rotated IPs.

### Phase 3 — Retention Loop (`ROADMAP.md` §Phase 3) — highest-leverage item *in this doc*

- **Integrations module.** **Linear two-way sync is THE Phase 3 deliverable** (status + comment round-trip, mapping config, loop guard) — without it week-2 retention is zero. **PR linking + auto-resolve** (GitHub/GitLab) ships alongside (Phase 3.2). The Settings → Integrations page and `useIntegrations.ts` are mock today. Jira / Slack / other OAuth are *not* Phase 3 — they come later. Note: even this, the most valuable web/API item here, still sits **behind Phase 1–2**.

### Phase 5 — Paid expansion / Team tier (`ROADMAP.md` §Phase 5) — post-PMF

- **Billing module** — Stripe subscription, seat counts, plan changes via the existing `PATCH /workspaces/current` plan field. Roadmap is explicit: "now — and *only* now" — do **not** build before the anchor moat has pulled users in.
- **Move attachments off inline base64 to object storage** (R2 / S3 / Vercel Blob). Schema already separates `Attachment.url`, so the migration is just the upload pipeline + URL format. Only becomes load-bearing when **screen clips** land (Phase 5.3) — no urgency before then.

### Phase 6 — Collab & scale (`ROADMAP.md` §6.3) — post-PMF

- **Notifications module** — preferences matrix (event × channel), dispatch infra, fan-out to email/in-app. Settings → Notifications UI is mock. Depends on the email pipeline above.

### Anytime — small UI cleanups (no phase, low-pri)

- **`SyncChip` and `useBoards`-imported `SESSIONS` ref** are still in the codebase but unused — leftover from the pre-API era. Safe to delete in a sweep PR.
- **`DetailsList` / `QueryList`** primitives exist but no current consumer. The cerebrum documents them as the recommended way to do future lists — leave for now.
- **Mobile issue detail Pin/Detail tab toggle** works but the click handler is finicky in Reka tabs (may need a `key` change to force re-render). Low-pri.
- **`useIssue`'s `pins` ref deep-clone** is shallow on most fields (`{...p, labels: [...p.labels]}`). If new ApiPin fields become writeable + nested, extend the clone.

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
curl -s "$B/workspaces"          -H "Authorization: Bearer $TOKEN" | jq
curl -s "$B/issues"              -H "Authorization: Bearer $TOKEN" | jq '.items[0]'
curl -s "$B/issues/counts"       -H "Authorization: Bearer $TOKEN" | jq
curl -s "$B/boards"              -H "Authorization: Bearer $TOKEN" | jq
curl -s "$B/workspaces/members"  -H "Authorization: Bearer $TOKEN" | jq
```

If those all return data, the API is fine — any wiring failure is on the web side.

---

## When you finish a phase
- Append a one-liner to `.wolf/memory.md`
- Update `.wolf/cerebrum.md` Key Learnings if you discovered a pattern
- Remove the matching row from the "still mock" table in this doc
- Move new TODOs into the "Outstanding TODOs" section here

Good luck. The hard architectural calls are made — this is mostly typing now.
