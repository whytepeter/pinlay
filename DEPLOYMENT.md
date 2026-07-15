# Deployment

Three deployable artifacts, three targets:

| App             | Target            | Config                                  |
| --------------- | ----------------- | --------------------------------------- |
| `apps/api`      | **Railway**       | [`railway.json`](railway.json)          |
| `apps/web`      | **Vercel**        | [`apps/web/vercel.json`](apps/web/vercel.json) |
| `apps/extension`| **Chrome Web Store** | [`apps/extension/wxt.config.ts`](apps/extension/wxt.config.ts) |

Deploy order: **API first** (it has no external deps), then set the web's
`VITE_API_URL` to the API URL and deploy the web, then point the extension's
`VITE_API_URL` / `VITE_WEB_APP_URL` at both and build the store zip.

---

## 1. API → Railway

The repo-root [`railway.json`](railway.json) drives the build. It installs the
pnpm workspace, builds `@pinlay/shared` + `@pinlay/api`, generates the Prisma
client, then starts with `prisma migrate deploy && node dist/main.js`.

**Railway service setup**

1. New Project → Deploy from GitHub repo → pick this repo.
2. Service **Root Directory: leave as repo root** (`/`). The build needs the
   root `pnpm-lock.yaml` + workspace to resolve `workspace:*` deps. Do **not**
   set it to `apps/api`.
3. Railway auto-detects the root `railway.json` and the
   `packageManager: pnpm@10.12.1` field (uses corepack).
4. Health check is already wired to `/api/health` (DB-checked).
5. Railway injects `PORT` automatically — **do not** set `PORT` yourself.

**Required env vars** (Railway → service → Variables):

| Var                       | Notes                                                        |
| ------------------------- | ------------------------------------------------------------ |
| `NODE_ENV`                | `production` (enables the fail-fast env validator)           |
| `DATABASE_URL`            | Neon Postgres connection string                              |
| `JWT_SECRET`              | ≥ 32 chars — `node -e 'console.log(crypto.randomBytes(48).toString("base64"))'` |
| `CORS_ORIGINS`            | The deployed web origin(s), comma-separated                  |
| `WEB_APP_URL`             | The deployed web origin (for invite links)                   |
| `STORAGE_*`               | Cloudflare R2 — all 5 required (see `apps/api/.env.example`)  |
| `MAIL_PROVIDER`/`MAIL_*`  | Optional — `disabled` logs invites instead of sending        |

`src/config/env.ts` refuses to boot in production if `JWT_SECRET < 32` chars,
`CORS_ORIGINS` is empty, or any `STORAGE_*` field is missing — so a broken
config fails the deploy instead of shipping insecure.

> **Migrations** run on every container start via `start:prod`. Fine for a
> single instance; if you later scale to multiple replicas, move
> `prisma migrate deploy` to a Railway pre-deploy/release step to avoid races.

**R2 CORS** — the bucket must allow `PUT` + `Content-Type` from the web origin.
Extension uploads are proxied server-side (Cloudflare R2 rejects
`chrome-extension://*` CORS entries), so only the web origin is needed there.

---

## 2. Web → Vercel

Already wired via [`apps/web/vercel.json`](apps/web/vercel.json) (Vite framework,
filtered install, SPA rewrite).

**Vercel project setup**

1. Import repo → Root Directory: `apps/web`.
2. Add env var **`VITE_API_URL`** = the Railway API URL **including `/api`**,
   e.g. `https://pinlay-api.up.railway.app/api`.
   - Without it the client falls back to `/api`, which only works behind the
     dev proxy — a deployed build would call its own origin and 404.
3. Deploy. Then add the resulting Vercel origin to the API's `CORS_ORIGINS`
   and `WEB_APP_URL` and redeploy the API.

---

## 3. Extension → Chrome Web Store

Build the production zip once the API + web are live:

```sh
VITE_API_URL="https://<railway-api>/api" \
VITE_WEB_APP_URL="https://<vercel-web>" \
pnpm --filter @pinlay/extension zip
```

The prod manifest drops the `localhost:*` `externally_connectable` entries and
keeps only `https://*.pinlay.app/*` (see `wxt.config.ts`). Still outstanding for
the store listing: privacy policy URL, per-permission justifications
(`<all_urls>`, `tabs`, `scripting`), screenshots, and a verified CWS developer
account.
