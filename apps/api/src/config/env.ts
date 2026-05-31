/**
 * Validated environment access.
 *
 * Centralises every `process.env` read so the rest of the app never touches
 * `process.env` directly. Validation runs once at boot (see `validateEnv`); a
 * misconfigured production deploy fails fast instead of silently opening a hole.
 */

export type NodeEnv = "development" | "test" | "production";

export interface AppEnv {
  nodeEnv: NodeEnv;
  port: number;
  corsOrigins: string[];

  jwtSecret: string;
  jwtExpiresIn: string;

  /** Max request body size (e.g. "10mb"). Sized for base64 screenshots. */
  bodyLimit: string;
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

  return {
    nodeEnv,
    port: Number(raw.PORT ?? 4000),
    corsOrigins,
    jwtSecret,
    jwtExpiresIn: raw.JWT_EXPIRES_IN?.trim() || "30d",
    bodyLimit: raw.BODY_LIMIT?.trim() || "10mb",
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
