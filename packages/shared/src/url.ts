/**
 * URL normalization — the single source of truth for "do these two URLs
 * point at the same logical page?".
 *
 * The matching rule for pins is *exact `pageUrl` equality* — so a pin dropped
 * on `…/checkout/?utm_source=email` and a revisit to `…/checkout` would
 * silently mismatch without this. We canonicalize both at write time AND at
 * query time so older clients sending raw URLs still resolve.
 *
 * Idempotent: `normalizeUrl(normalizeUrl(x)) === normalizeUrl(x)`.
 * Defensive: an unparseable input is returned unchanged — better than
 * corrupting user-supplied data with a silent fallback.
 *
 * Shared deliberately: the API canonicalizes at the boundary, but the
 * extension (and the web app) can call this too — e.g. to compare two URLs
 * client-side without a round-trip.
 */

/**
 * Query-string keys that are stripped before matching. These are universally
 * cosmetic for routing (ad campaigns, click trackers, mail-link tags) — they
 * vary across visits to the same logical page and shouldn't fragment pins.
 * NOT stripped: anything app-meaningful, including `id`, `page`, `tab`, etc.
 */
const TRACKING_PARAMS = new Set<string>([
  // Google Ads / Analytics
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "dclid",
  "gclsrc",
  "_ga",
  // Facebook / Meta
  "fbclid",
  // Microsoft Ads
  "msclkid",
  // Mailchimp
  "mc_cid",
  "mc_eid",
  // HubSpot
  "_hsenc",
  "_hsmi",
  // Instagram
  "igshid",
  // Vero
  "vero_id",
  // Yandex
  "yclid",
  // Generic affiliate / referral
  "ref",
  "source",
  "referrer",
]);

/**
 * Normalize a URL so semantically-equivalent URLs match.
 *
 * Rules applied (in order):
 *  1. Lowercase the host (the authority is case-insensitive per RFC 3986).
 *  2. Drop the fragment (`#...`) — never relevant to page identity.
 *  3. Strip tracking query params (see TRACKING_PARAMS).
 *  4. Sort remaining query params alphabetically so `?b=2&a=1` matches
 *     `?a=1&b=2`.
 *  5. Strip a trailing slash from non-root paths (`/foo/` → `/foo`).
 *
 * Does NOT touch: protocol (http vs https are different sites), the path
 * itself (case-sensitive in general — apps decide), or non-tracking params.
 */
export function normalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  url.host = url.host.toLowerCase();
  url.hash = "";

  const filtered = Array.from(url.searchParams.entries())
    .filter(([k]) => !TRACKING_PARAMS.has(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  const sp = new URLSearchParams();
  for (const [k, v] of filtered) sp.append(k, v);
  url.search = sp.toString();

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}
