# Backend Spec (`apps/api`)

NestJS (Express platform) + Prisma + Postgres (Neon-hostable). Media stored
inline as data-URLs on the row for v1 (object storage — R2 / S3 — arrives when
screen clips do). Async work runs inline for v1 (a queue lib like BullMQ when
integration-sync / notifications need it). JWT auth (`@nestjs/jwt`) + bcrypt. The
API is the contract shared by `web` and `extension`; its request/response shapes
and enums live in `@pinlay/shared`.

> _Stack note (2026-05-30):_ this spec originally called for Hono on Cloudflare
> Workers + Drizzle + R2 + Cloudflare Queues. The shipped `apps/api` is
> NestJS + Prisma + Postgres; this doc has been reconciled to match. The data
> model, API surface, and principles below are unchanged — only the runtime,
> ORM, storage, and async mechanism differ.

> The data model here is **purpose-built for pinlay's UI** — it is not lifted
> from DeveProbe and not the Claude Design mock. Key choice: the **Session is the
> single unit** (card = thing you open = sync target). There is no separate "issue"
> table.

## 1. Principles

- **Session is the unit.** All pins from one sitting on one URL belong to one
  session; the session is what the dashboard lists, opens, and syncs.
- **Lazy creation.** A session is created on the **first** pin of a URL sitting;
  later pins attach immediately, so a review survives a tab close.
- **Derived rollups.** `session.severityCounts` and `pinCount` are denormalized for
  fast list queries; recomputed on pin create/update/delete.
- **Org-scoped everything.** Every row carries `orgId`; every handler verifies
  ownership.
- **Shared schemas.** zod + TS types defined once in `@pinlay/shared`. No drift.

## 2. Enums (`@pinlay/shared`)

Deliberately small — only what the UI expresses.

```
Severity  = critical | high | medium | low
Status    = open | in_progress | resolved            (+ lifecycle: draft, archived)
PinType   = visual | layout | copy | broken | missing | a11y | perf | other
SyncState = ok | pending | failed
Role      = owner | admin | member | viewer
IntegrationKind = linear | jira | github | gitlab | azure | shortcut
                | slack | teams | discord | figma | storybook
                | notion | confluence | webhook
```

`session.status` is the rolled-up display status (any open → open; all resolved →
resolved; otherwise in_progress) or an explicit override. Pins carry their own
`status`.

## 3. Data model

**org** — id, name, slug, plan, createdAt.
**user** — id, orgId, email, name, avatarHue, passwordHash, createdAt.
**membership** — id, orgId, userId, role (Role).

**pinboard** `[v1]` — id, orgId, name, hue, urlPattern?, defaultIntegrationId?,
createdAt. A saved grouping of sessions by area.

**session** *(the dashboard unit)* — id, orgId, **shortId** (`PL-0142`), title,
pageUrl, urlPath, faviconLabel, faviconHue, pinboardId?, reporterId, status
(Status), reviewTag?, **pinCount** (derived), **severityCounts**
`{critical,high,medium,low}` (derived), createdAt, updatedAt.

**pin** — id, sessionId, **index**, title, body, severity (Severity), type
(PinType), status (Status), assigneeId?, **anchor (jsonb)**, offsetX, offsetY,
screenshotId?, stale (bool), createdById, createdAt, updatedAt.

**anchor** *(embedded jsonb on pin, validated client-side)* — selector, xpath, tag,
role, accessibleName, textFingerprint, attributeFingerprint, ancestorFingerprint,
boundingBox, viewportSize, devicePixelRatio, scrollPosition, urlPath.

**comment** — id, scope (session|pin), targetId, authorId, body (markdown), createdAt.
**activity_event** — id, scope, targetId, kind (pinned|sync|assign|status|comment),
actorId?, payload (jsonb), createdAt.
**attachment** — id, orgId, kind (screenshot|clip), r2Key, contentType, width,
height, bytes, createdById, createdAt.

**integration** — id, orgId, kind (IntegrationKind), connected, account (label),
config (jsonb: target, mappings, syncDirection), createdAt.
**sync_record** — id, pinId, integrationId, externalKey, state (SyncState),
lastSyncedAt.

## 4. API surface

All under `/` behind the JWT auth guard (`JwtAuthGuard`) except auth routes (and
those marked anonymous). JSON in/out; `ok()`/`err()` envelopes.

**Auth**
- `POST /auth/signup` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`

**Pins (capture)**
- `POST /pins` — create a pin. Omit `sessionId` on the **first** pin → server
  creates the session (with a `shortId`). Returns `{ pin, session }`.
- `PATCH /pins/:id` — title, body, severity, status, type, assignee, anchor, offsets.
  (Optimistic-update target; recomputes session rollups; emits `activity_event`.)
- `DELETE /pins/:id`
- `GET /pins?sessionId=…` — pins for a session (numbered order).
- `GET /pins?pageUrl=…` — pins for a URL (extension developer overlay).

**Sessions (dashboard)**
- `GET /sessions?status=&severity=&type=&assignee=&pinboard=&q=&sort=&cursor=` —
  paginated cards with `severityCounts`, `pinCount`, `reporter`,
  `integration {name,synced,state}`, `status`, `ago`.
- `GET /sessions/:id` — one session for the detail header.
- `POST /sessions/:id/submit` — set real title + summary, mark submitted.
- `PATCH /sessions/:id` — status, title, pinboard, reviewTag.

**Comments / activity**
- `POST /comments` (scope+targetId+body) · `GET /activity?scope=&targetId=`

**Attachments**
- `POST /attachments` · `GET /attachments/:id` — v1 stores the (redacted)
  data-URL inline on the row; swaps to presigned object-storage upload + signed
  read URLs when screen clips land.

**Integrations**
- `GET /integrations` · `POST /integrations/:kind/connect` ·
  `GET /integrations/:kind/callback` · `PATCH /integrations/:id` ·
  `DELETE /integrations/:id` · `POST /integrations/:id/test`

**Pinboards** `[v1]` — `GET/POST/PATCH/DELETE /pinboards[/:id]`
**Overview analytics** `[v1]` — `GET /analytics/overview?range=7d|30d|90d`

## 5. Auth

JWT (`@nestjs/jwt`) signed with a server secret; bcrypt password hashing. Token
carries `{ userId, orgId, role }`. `JwtAuthGuard` verifies it and injects the
authenticated user (via the `@CurrentUser()` decorator). The extension stores the
token in extension storage and sends it via the background proxy (which carries
the `chrome-extension://` origin the API expects).

## 6. Async jobs

Run **inline** within the request for v1. Promote to a queue (BullMQ or similar)
once these need retries / off-request latency:

- **integration_sync** — push a pin to its integration, write `sync_record`,
  reflect external state (`ok|pending|failed`), emit a `sync` activity event.
- **notification** — email/Slack on submit, assign, status change, critical pin.
- **ai** `[later]` — title generation, severity suggestion, duplicate detection
  (url + anchor + screenshot + text), session summary.

## 7. Storage

**v1: inline** — attachment bytes persist as a (client-redacted) data-URL on the
attachment row, served directly. When screen clips arrive (a paid-expansion
feature, ROADMAP Phase 5), move to object storage (R2 / S3): presigned uploads,
redacted client-side before transfer, reads via short-lived signed URLs.

## 8. Reuse vs. rebuild

- **Reuse the ideas, not the schema** from DeveProbe: the lazy-session pattern and
  the anchor resolution-order logic are proven — port the *logic*.
- **Rebuild** the schema per §3 (collapsed session unit, small status enum, no
  recording/console/network tables). Repro capture (a `pin.debug` jsonb column,
  breadcrumbs, clip attachments) is an **additive Team-tier expansion**
  (ROADMAP Phase 5) — deliberately absent from the v1 schema, not forgotten.

## 9. Acceptance criteria

- First pin on a fresh URL creates a session, returns it with a `shortId`, and the
  pin attaches at `index = 1`.
- `GET /sessions` returns cards with correct `severityCounts` and integration sync
  state, filterable and paginated.
- `PATCH /pins/:id` status change recomputes `session.severityCounts`/`status`,
  emits an `activity_event`, and (if connected) enqueues `integration_sync`.
- Org isolation: a user cannot read or mutate another org's session/pin.
