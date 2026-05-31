export const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL ?? "http://localhost:5173";
// The API mounts every route under the global prefix `/api`
// (apps/api/src/main.ts → setGlobalPrefix("api")) and the client paths in
// lib/api.ts are prefix-less (`/auth/me`, `/annotation/pins`), so the base
// URL must include `/api`. Override with VITE_API_URL for other hosts.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787/api";
