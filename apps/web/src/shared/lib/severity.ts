import type { Severity, SeverityCounts } from "@pinlay/shared";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

/** The highest-priority severity present (drives the card's left bar). */
export function topSeverity(counts: SeverityCounts): Severity {
  for (const k of SEVERITY_ORDER) {
    if (counts[k] > 0) return k;
  }
  return "low";
}

export const sevBg: Record<Severity, string> = {
  critical: "bg-sev-critical",
  high: "bg-sev-high",
  medium: "bg-sev-medium",
  low: "bg-sev-low",
};

export const sevRing: Record<Severity, string> = {
  critical: "ring-sev-critical/20",
  high: "ring-sev-high/20",
  medium: "ring-sev-medium/20",
  low: "ring-sev-low/20",
};
