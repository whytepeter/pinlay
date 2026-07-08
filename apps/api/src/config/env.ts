/**
 * Validated environment access.
 *
 * Centralises every `process.env` read so the rest of the app never touches
 * `process.env` directly. Validation runs once at boot (see `validateEnv`); a
 * misconfigured production deploy fails fast instead of silently opening a hole.
 */

export type NodeEnv = "development" | "test" | "production";

export type MailProvider = "resend" | "disabled";

/**
 * Cloudflare R2 config. All fields are required — the API refuses to boot
 * without them so a broken upload flow can't ship as a mystery 500 later.
 */
export interface StorageConfig {
  bucket: string;
  /** S3-compat endpoint: `https://<accountid>.r2.cloudflarestorage.com`. */
  endpoint: string;
  /** Region string. R2 wants "auto". */
  region: string;
  accessKey: string;
  secretKey: string;
  /**
   * Base URL that objects resolve to for public reads — either the bucket's
   * `pub-<hash>.r2.dev` subdomain or a custom domain in front of it. Must
   * NOT include a trailing slash.
   */
  publicUrlBase: string;
  /** Per-object hard cap (bytes). Presign refuses anything larger. */
  maxUploadBytes: number;
}

export interface AppEnv {
  nodeEnv: NodeEnv;
  port: number;
  corsOrigins: string[];

  jwtSecret: string;
  jwtExpiresIn: string;

  /** Max request body size (e.g. "10mb"). Sized for base64 screenshots. */
  bodyLimit: string;

  /** Public URL for the dashboard. Used to mint invite-accept URLs etc. */
  webAppUrl: string;

  /** Transactional email config. `disabled` logs payloads instead of sending. */
  mailProvider: MailProvider;
  mailApiKey: string | null;
  mailFrom: string;

  /** Object storage config for attachments + avatars. */
  storage: StorageConfig;
}

/**
 * Parse + validate once. Throws on a production misconfiguration so the
 * process refuses to start rather than booting insecure.
 */
export function validateEnv(
  raw: NodeJS.ProcessEnv = process.env,
): AppEnv {
  const nodeEnv = (raw.NODE_ENV ?? "development") as NodeEnv;
  const isProd = nodeEnv === "production";

  const jwtSecret = raw.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required.");
  }
  if (isProd && jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters in production.",
    );
  }

  const corsOrigins = (raw.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (isProd && corsOrigins.length === 0) {
    throw new Error("CORS_ORIGINS must be set in production.");
  }

  // ── Mail config ────────────────────────────────────────────────────────
  // Default to `disabled` so a missing key in dev doesn't break the invite
  // flow — the MailService logs the payload instead of attempting a send.
  // In production we still allow `disabled` (admins can copy the invite
  // link manually) but warn loudly so it's noticed.
  const rawProvider = (raw.MAIL_PROVIDER?.trim() || "disabled").toLowerCase();
  const mailProvider: MailProvider =
    rawProvider === "resend" ? "resend" : "disabled";
  const mailApiKey = raw.MAIL_API_KEY?.trim() || null;
  if (mailProvider === "resend" && !mailApiKey) {
    throw new Error("MAIL_API_KEY is required when MAIL_PROVIDER=resend.");
  }
  if (isProd && mailProvider === "disabled") {
    // eslint-disable-next-line no-console
    console.warn(
      "[env] MAIL_PROVIDER=disabled in production — invite emails will NOT send.",
    );
  }

  // ── Storage config ─────────────────────────────────────────────────────
  // Cloudflare R2 via the S3-compatible SDK. All fields required — the API
  // refuses to boot without them so a misconfigured deploy fails fast rather
  // than surfacing as a mystery 500 on first upload.
  const storage: StorageConfig = {
    bucket: raw.STORAGE_BUCKET?.trim() || "",
    endpoint: raw.STORAGE_ENDPOINT?.trim().replace(/\/$/, "") || "",
    region: raw.STORAGE_REGION?.trim() || "auto",
    accessKey: raw.STORAGE_ACCESS_KEY?.trim() || "",
    secretKey: raw.STORAGE_SECRET_KEY?.trim() || "",
    publicUrlBase: raw.STORAGE_PUBLIC_URL_BASE?.trim().replace(/\/$/, "") || "",
    maxUploadBytes: Number(raw.STORAGE_MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024),
  };
  const missingStorage: string[] = [];
  if (!storage.bucket) missingStorage.push("STORAGE_BUCKET");
  if (!storage.endpoint) missingStorage.push("STORAGE_ENDPOINT");
  if (!storage.accessKey) missingStorage.push("STORAGE_ACCESS_KEY");
  if (!storage.secretKey) missingStorage.push("STORAGE_SECRET_KEY");
  if (!storage.publicUrlBase) missingStorage.push("STORAGE_PUBLIC_URL_BASE");
  if (missingStorage.length > 0) {
    throw new Error(
      `Object storage config incomplete — missing: ${missingStorage.join(", ")}.`,
    );
  }

  return {
    nodeEnv,
    port: Number(raw.PORT ?? 4000),
    corsOrigins,
    jwtSecret,
    jwtExpiresIn: raw.JWT_EXPIRES_IN?.trim() || "30d",
    bodyLimit: raw.BODY_LIMIT?.trim() || "10mb",
    webAppUrl:
      raw.WEB_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:5173",
    mailProvider,
    mailApiKey,
    mailFrom: raw.MAIL_FROM?.trim() || "pinlay <onboarding@resend.dev>",
    storage,
  };
}

/**
 * Singleton — validated at import time on first use. Both the Nest bootstrap
 * (main.ts) and the guard read from here, so there's exactly one source of
 * truth and one place that can ever read `process.env`.
 */
let cached: AppEnv | null = null;
export function env(): AppEnv {
  if (!cached) cached = validateEnv();
  return cached;
}
