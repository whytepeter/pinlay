# Deployment

## Live environments (as of 2026-07-27)

| Piece | URL | Status |
| --- | --- | --- |
| API | `https://pinlay-api-production.up.railway.app/api` | ✅ deployed, health check green |
| Web | `https://pinlay-web.vercel.app` | ✅ deployed |
| Extension | — | built, not yet submitted to the Store |

**Intended permanent domain: `pinlay.io`** — not registered as of 2026-07-27.
When it is, the switch touches: Vercel domain settings, the API's
`CORS_ORIGINS` + `WEB_APP_URL`, the R2 bucket's CORS origins,
`externally_connectable` in `wxt.config.ts` (then rebuild + resubmit the
extension), and the `privacy@` / `security@` / `legal@` mailboxes the legal
pages promise (`apps/web/src/features/legal/legal-meta.ts`).

---

pinlay ships as three deployable artifacts. Deploy in this order — each
later stage needs the URL(s) from the stage(s) before it.

| # | App               | Target               | Config                                                         |
| - | ----------------- | -------------------- | --------------------------------------------------------------- |
| 1 | `apps/api`        | **Railway**           | [`railway.json`](railway.json)                                  |
| 2 | `apps/extension`  | **Chrome Web Store**  | [`apps/extension/wxt.config.ts`](apps/extension/wxt.config.ts)  |
| 3 | `apps/web`        | **Vercel**             | [`apps/web/vercel.json`](apps/web/vercel.json)                  |

**Why this order:** the API has no dependency on the other two. The
extension's production manifest bakes in `https://*.pinlay.io/*` as its
`externally_connectable` origin and needs the live API URL at build time, so
build it after the API exists (you can still submit it to the Store while
the web app catches up — the popup degrades gracefully if `WEB_APP_URL` is
briefly stale). The web app needs the API's URL for `VITE_API_URL`, and once
it's live you feed its origin back into the API's `CORS_ORIGINS` /
`WEB_APP_URL` and redeploy the API once more. Budget for that one loop-back
redeploy of the API after step 3.

**Prerequisites (accounts/services):**

- [Neon](https://neon.tech) — Postgres database
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — object storage (attachments, avatars)
- [Railway](https://railway.app) — API hosting
- [Vercel](https://vercel.com) — web app hosting
- [Resend](https://resend.com) — transactional email (optional; `MAIL_PROVIDER=disabled` is a valid fallback)
- A verified [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
- Node ≥ 20, pnpm 10.12.1 (`packageManager` field in root `package.json` — Railway/local both use corepack to match this exactly)

---

## 1. API → Railway

`apps/api` is NestJS 11 + Prisma 6 against Neon Postgres, with Cloudflare R2
for object storage. The repo-root [`railway.json`](railway.json) drives the
whole build — Railway needs no manual build/start command configuration.

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --frozen-lockfile && pnpm --filter @pinlay/shared build && pnpm --filter @pinlay/api db:generate && pnpm --filter @pinlay/api build"
  },
  "deploy": {
    "startCommand": "pnpm --filter @pinlay/api start:prod",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

`start:prod` runs `prisma migrate deploy && node dist/main.js` — migrations
apply automatically on every boot.

### 1.1 Neon Postgres

1. Create a project + database (e.g. `pinlay`) at neon.tech.
2. Copy the **Pooled connection** string (port 5432 via PgBouncer) — that's
   `DATABASE_URL`. Prisma also tolerates the direct connection string if you
   need it for a shadow DB during local migrations (`DIRECT_URL`, optional).

### 1.2 Cloudflare R2 (attachments + avatars)

1. Cloudflare dashboard → R2 → **Create bucket** (e.g. `pinlay-uploads`).
2. R2 → **Manage API tokens** → Create Token, scope **Object Read & Write** →
   note the Access Key ID, Secret Access Key, and Account Endpoint
   (`https://<accountid>.r2.cloudflarestorage.com`).
3. Bucket → Settings → enable **Public access** (gives you a
   `pub-<hash>.r2.dev` URL) or attach a custom domain — either becomes
   `STORAGE_PUBLIC_URL_BASE` (no trailing slash).
4. Bucket → Settings → **CORS**: allow `PUT` + the `Content-Type` header from
   the deployed **web** origin only. Extension uploads are proxied
   server-side (background worker's `API_FETCH` bridge), so R2 never sees a
   `chrome-extension://` origin directly and you don't need to add one — R2
   would reject it anyway.

### 1.3 Railway service setup

1. New Project → **Deploy from GitHub repo** → select this repo.
2. **Root Directory: leave as the repo root (`/`)** — do **not** set it to
   `apps/api`. The build needs the root `pnpm-lock.yaml` and workspace to
   resolve `workspace:*` deps (`@pinlay/shared`).
3. Railway auto-detects `railway.json` and the root `packageManager:
   pnpm@10.12.1` field via corepack — no manual build settings needed.
4. Health check is already wired to `/api/health` (checks DB connectivity).
5. Railway injects `PORT` automatically at runtime — **do not** set `PORT`
   as a service variable; `src/config/env.ts` reads it and falls back to
   `4000` only when unset (local dev).

### 1.4 Environment variables (Railway → service → Variables)

| Var | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | ✅ | `production` — enables the fail-fast validator in `src/config/env.ts` |
| `DATABASE_URL` | ✅ | Neon pooled connection string |
| `JWT_SECRET` | ✅ | ≥ 32 chars in production or boot fails. Generate: `node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))'` |
| `JWT_EXPIRES_IN` | – | Default `30d` |
| `CORS_ORIGINS` | ✅ | Comma-separated web origin(s), e.g. `https://app.pinlay.io,https://pinlay.vercel.app`. Boot fails if empty in production. `chrome-extension://*` origins are allowed automatically in code (`main.ts`) — don't add them here. |
| `WEB_APP_URL` | – | Deployed web origin, no trailing slash — used to mint invite-accept links. Defaults to `http://localhost:5173`. |
| `BODY_LIMIT` | – | Default `1mb` — small on purpose; attachments upload via presigned R2 URLs, not through Nest |
| `STORAGE_ENDPOINT` | ✅ | `https://<accountid>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET` | ✅ | R2 bucket name |
| `STORAGE_REGION` | – | Default `auto` (R2 convention) |
| `STORAGE_ACCESS_KEY` | ✅ | R2 API token access key ID |
| `STORAGE_SECRET_KEY` | ✅ | R2 API token secret |
| `STORAGE_PUBLIC_URL_BASE` | ✅ | Public read base URL, no trailing slash |
| `STORAGE_MAX_UPLOAD_BYTES` | – | Default `20971520` (20 MB) |
| `MAIL_PROVIDER` | – | `disabled` (default, logs invite payloads) or `resend` |
| `MAIL_API_KEY` | conditional | Required if `MAIL_PROVIDER=resend` |
| `MAIL_FROM` | – | Default `pinlay <onboarding@resend.dev>` |

`src/config/env.ts` validates all of this at process boot and **throws
before the server starts** if `JWT_SECRET` is too short, `CORS_ORIGINS` is
empty, or any `STORAGE_*` field is missing in production — a broken config
fails the Railway deploy loudly instead of shipping a silently-broken API.

### 1.5 Migrations

Migrations run automatically on every container start (`start:prod` →
`prisma migrate deploy`). This is fine for a single instance. **If you ever
scale to multiple replicas**, move `prisma migrate deploy` out of the start
command into a Railway pre-deploy/release step so concurrent boots don't
race on the same migration.

### 1.6 Verify

```bash
curl https://<your-railway-domain>/api/health
```

Should return a 200 with a DB-checked payload. If it fails, check the
Railway deploy logs for the `src/config/env.ts` validation error first —
it names the exact missing/invalid variable.

---

## 2. Chrome Extension → Chrome Web Store

`apps/extension` is WXT + Vue 3 + Tailwind v4 (`@pinlay/extension`),
capture-only (no recording, no `tabCapture`/`debugger`/`offscreen`
permissions). Build it once the API is live; the web app can still be
mid-deploy since the popup handles a temporarily-unreachable dashboard link
gracefully.

### 2.1 Manifest facts (`wxt.config.ts`)

- **Permissions:** `tabs`, `activeTab`, `storage`, `scripting`
- **Host permissions:** `<all_urls>` (needed to anchor pins + capture
  screenshots on any page the user annotates)
- **`externally_connectable`** (who the dashboard/localhost can message the
  extension from):
  - dev mode: `http://localhost:5173/*`, `http://localhost:4173/*`, `https://*.pinlay.io/*`
  - prod mode: `https://*.pinlay.io/*` only — the localhost entries are
    dropped automatically by the `mode` check in `wxt.config.ts`
- **Commands:** `Ctrl+Shift+P` / `Cmd+Shift+P` — quick "drop a pin" shortcut
  (user-rebindable at `chrome://extensions/shortcuts`)
- Manifest `version` is hand-set in `wxt.config.ts` (`"1.0.0"` currently) —
  bump it before every Store submission; Chrome rejects a re-upload with an
  unchanged version.

### 2.2 Build the production zip

Run this **after** the API (and ideally the web app) are live, pointing at
their real URLs:

```bash
VITE_API_URL="https://<railway-api-domain>/api" \
VITE_WEB_APP_URL="https://<vercel-web-domain>" \
pnpm --filter @pinlay/extension zip
```

- `VITE_API_URL` must include the `/api` prefix (see `src/lib/env.ts`) — it
  falls back to `http://localhost:8787/api` otherwise, which would ship a
  build that talks to nothing in production.
- `VITE_WEB_APP_URL` falls back to `http://localhost:5173` — set it or the
  popup's "open in dashboard" links break.
- Output: `apps/extension/.output/pinlay-<version>-chrome.zip`, ready to
  upload as-is.

`wxt zip` builds first (equivalent to `wxt build`) then zips
`.output/chrome-mv3`. There's also `build:firefox` / `zip:firefox`-style
targets available (`dev:firefox`, `build:firefox` in `package.json`) if a
Firefox listing is ever needed — not currently a shipping target.

### 2.3 Local smoke-test before submitting

1. `pnpm --filter @pinlay/extension build` (or reuse the zip's unpacked
   output — unzip it, or just build without zipping).
2. `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   select `apps/extension/.output/chrome-mv3`.
3. Visit any page, trigger the launcher FAB or the popup, confirm pins post
   successfully against the real API (check the Network tab inside the
   extension's background service worker devtools, not the page's).
4. Confirm the popup's login/dashboard links resolve to the real web app
   origin, not localhost.

### 2.4 Chrome Web Store submission

1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) →
   **New item** → upload the zip from 2.2.
2. Store listing requirements:
   - **Privacy policy URL** — published at
     [`/privacy`](apps/web/src/features/legal/PrivacyView.vue), live at
     `https://pinlay-web.vercel.app/privacy`. ⚠️ It discloses that the
     content script sends the **hostname** of visited pages to the API while
     signed in (`content.ts` → `getHostPins(location.host)`). If that
     behaviour ever changes, the policy must change with it — reviewers
     compare the policy against observed network behaviour.
   - ⚠️ The `privacy@pinlay.io` / `security@pinlay.io` addresses the policy
     lists must be **live and monitored before submitting** — a bouncing
     contact address is a rejection risk.
   - Per-permission justification text (Chrome now requires a written
     justification for broad host permissions and `scripting`/`tabs` in the
     submission form)
   - At least one 1280×800 or 640×400 promotional/screenshot image
   - Icon set (auto-generated at build time by `@wxt-dev/auto-icons` from
     `src/assets/icon.svg` — 16/32/48/128px, no manual action needed)
3. Submit for review. Initial review for a new item is typically
   **several business days to ~2 weeks**; broad host-permission extensions
   get extra scrutiny — expect follow-up questions about the `<all_urls>`
   justification.
4. On approval, the Store assigns a **stable extension ID**. If anything
   in the codebase hardcodes or assumes a specific extension ID (there
   currently isn't one — IDs aren't enumerable, which is why CORS trusts
   any `chrome-extension://` origin server-side, see §1.4), no change is
   needed; otherwise update it now.

### 2.5 Updating a published extension

1. Bump `version` in `wxt.config.ts`'s manifest block.
2. Rebuild the zip with the same `VITE_API_URL` / `VITE_WEB_APP_URL`
   invocation as 2.2 (or newer URLs if infra moved).
3. Developer Dashboard → the existing item → **Package** → upload the new
   zip → submit. Updates typically review faster than new-item submissions
   but can still take days.

---

## 3. Web App → Vercel

`apps/web` (`@pinlay/web`) is Vue 3 + Vite + Tailwind v4, deployed as a
static SPA. Deploy after the API is live so you have a real
`VITE_API_URL` to set.

### 3.1 `vercel.json` (already wired)

```json
{
  "framework": "vite",
  "installCommand": "pnpm install --filter @pinlay/web...",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `installCommand` scopes the pnpm install to `@pinlay/web` and its
  workspace deps (`...` = include dependencies) rather than the whole repo —
  faster installs on Vercel.
- The catch-all rewrite is required for the Vue Router history mode SPA —
  without it, a hard refresh on any non-root route (e.g. `/settings`) 404s.

### 3.2 Vercel project setup

1. Import the repo → **Root Directory: `apps/web`**.
2. Add environment variable **`VITE_API_URL`** = the Railway API URL
   **including the `/api` prefix**, e.g.
   `https://pinlay-api.up.railway.app/api`.
   - Vite only exposes vars prefixed `VITE_` to the client bundle — nothing
     secret should ever go in one (see `apps/web/.env.example`).
   - Without this var the client falls back to `/api`, which only resolves
     via the local dev proxy (`vite.config.ts` → `:8787`). A deployed build
     without it will call its own Vercel origin for `/api/*` and 404
     everything.
3. Deploy.
4. **Loop back to the API:** add the resulting Vercel origin(s) — the
   production domain and, if used, preview-deployment domains — to the
   API's `CORS_ORIGINS` and set `WEB_APP_URL` to the primary one, then
   redeploy the API (Railway → redeploy). Until this step, the deployed web
   app's API calls will fail CORS.

### 3.3 Verify

1. Open the deployed URL, confirm the landing page renders and static
   assets load (Vercel serves `dist/` as static files).
2. Try logging in / signing up — this is the first real API round-trip;
   a CORS failure here almost always means step 3.2.4 wasn't done yet, or
   the origin doesn't match exactly (scheme + host, no trailing slash).
3. Hard-refresh a nested route (e.g. `/settings`) to confirm the SPA
   rewrite is working.
4. From the dashboard, use "Install browser extension" / "Connect
   extension" flows to confirm the extension's `externally_connectable`
   matches this domain (`https://*.pinlay.io/*` in the prod manifest — if
   the actual deployed domain isn't under `pinlay.io`, update that pattern
   in `wxt.config.ts` and rebuild the extension).

---

## Post-deploy checklist (all three)

- [ ] API `/api/health` returns 200
- [ ] Web app loads, login/signup round-trips to the API without CORS errors
- [ ] API `CORS_ORIGINS` + `WEB_APP_URL` include the final Vercel domain
- [ ] Extension zip built with the final `VITE_API_URL` / `VITE_WEB_APP_URL`
- [ ] Extension popup can authenticate and post a pin against the live API
- [ ] R2 bucket CORS allows `PUT` from the final web origin
- [ ] `JWT_SECRET` is a real random ≥32-char value, not the `.env.example` placeholder
- [ ] Chrome Web Store listing has privacy policy + permission justifications + screenshots (first submission only)

## Rollback notes

- **API:** Railway keeps prior deploys — redeploy an earlier build from the
  service's Deployments tab. Note migrations already applied by
  `prisma migrate deploy` are not automatically reverted; a rollback that
  needs a schema revert requires a new down-migration, not just redeploying
  old code.
- **Web:** Vercel keeps every deployment; "Promote to Production" on a
  prior deployment is an instant rollback.
- **Extension:** the Chrome Web Store does not support instant rollback —
  publishing an older package as a new version (with a higher version
  number than the current live one) is the only path back.
