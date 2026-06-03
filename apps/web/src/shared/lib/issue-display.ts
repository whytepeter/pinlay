import type { IssueSummary } from "@/shared/lib/api";

/**
 * Client-derived display fields for an issue summary. The API intentionally
 * does not return presentational data (faviconLabel, urlPath, faviconHue) —
 * the client builds them from `pageUrl` + `id`.
 */
export interface IssueDisplay {
  urlPath: string;
  faviconLabel: string;
  faviconHue: number;
  hostShort: string;
}

/** Stable deterministic hue (0–359) derived from any string identifier. */
export function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

export function issueDisplay(issue: IssueSummary): IssueDisplay {
  let urlPath = "/";
  let host = "";
  try {
    const u = new URL(issue.pageUrl);
    urlPath = u.pathname + u.search;
    host = u.host;
  } catch {
    /* keep defaults */
  }
  const cleanHost = host.replace(/^www\./, "");
  const faviconLabel = (cleanHost.match(/[a-z0-9]/i)?.[0] ?? "?")
    .concat(cleanHost.split(".")[0]?.[1] ?? "")
    .toUpperCase()
    .slice(0, 2);
  return {
    urlPath,
    hostShort: cleanHost,
    faviconLabel: faviconLabel || "??",
    faviconHue: hashHue(issue.id),
  };
}
