/**
 * Single source of truth for the facts the legal pages assert.
 *
 * These are real-world claims, not styling — keep them accurate. The Chrome
 * Web Store review reads the privacy policy against the extension's actual
 * manifest permissions, so anything here that drifts from what the code does
 * is a compliance problem, not a copy nit.
 */

/**
 * Role addresses on the pinlay.io domain.
 *
 * ⚠️ The domain is not registered yet (as of 27 Jul 2026). These must be
 * live and monitored BEFORE the site goes public or the extension is
 * submitted to the Chrome Web Store — a privacy policy whose contact address
 * bounces is both a review-rejection risk and a real problem for anyone
 * exercising a data right.
 */
export const PRIVACY_EMAIL = "privacy@pinlay.io";
export const SECURITY_EMAIL = "security@pinlay.io";
export const LEGAL_EMAIL = "legal@pinlay.io";

/** Where data/privacy requests go. Publicly visible. */
export const CONTACT_EMAIL = PRIVACY_EMAIL;

/**
 * Last substantive change to the policy text. Bump when the wording changes
 * in a way that affects what users are agreeing to — not on typo fixes.
 */
export const EFFECTIVE_DATE = "27 July 2026";

/**
 * The entity users are contracting with. Until a company is registered this
 * is the operator's own name — say so plainly rather than implying a
 * corporation that doesn't exist.
 */
export const ENTITY = "the pinlay project";

/**
 * Subprocessors — every third party that can hold user data. Sourced from
 * the actual deploy: Railway (API), Neon (Postgres), Cloudflare R2 (uploads),
 * Vercel (dashboard hosting), Resend (invite email, only when MAIL_PROVIDER
 * is enabled). Update this list whenever the infrastructure changes.
 */
export const SUBPROCESSORS = [
  {
    name: "Railway",
    purpose: "Hosts the API server that processes requests.",
    url: "https://railway.app/legal/privacy",
  },
  {
    name: "Neon",
    purpose: "Managed Postgres database storing accounts, workspaces and pins.",
    url: "https://neon.tech/privacy-policy",
  },
  {
    name: "Cloudflare R2",
    purpose: "Object storage for screenshots and profile images.",
    url: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "Vercel",
    purpose: "Hosts and serves the web dashboard.",
    url: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Resend",
    purpose: "Delivers workspace invitation emails.",
    url: "https://resend.com/legal/privacy-policy",
  },
] as const;
