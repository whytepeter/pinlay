import { computed, ref } from "vue";
import type { Severity, SeverityCounts } from "@pinlayer/shared";
import { SESSIONS, statusCounts } from "@/shared/lib/data";
import { SEVERITY_ORDER, topSeverity } from "@/shared/lib/severity";

export type ViewMode = "grid" | "list";
export type StatusFilter = "all" | "open" | "in_progress" | "resolved";
export type SeverityFilter = "all" | Severity;
export type SortMode = "recent" | "severity" | "pins";

function rank(counts: SeverityCounts): number {
  return SEVERITY_ORDER.length - SEVERITY_ORDER.indexOf(topSeverity(counts));
}

export function useSessions() {
  const status = ref<StatusFilter>("all");
  const severity = ref<SeverityFilter>("all");
  const assignee = ref<string>("all");
  const query = ref("");
  const sort = ref<SortMode>("recent");
  const view = ref<ViewMode>("grid");

  const counts = computed(() => statusCounts());

  const filtered = computed(() => {
    let list = SESSIONS.slice();

    if (status.value !== "all") {
      list = list.filter((s) => s.status === status.value);
    }
    if (severity.value !== "all") {
      const sev = severity.value;
      list = list.filter((s) => s.severityCounts[sev] > 0);
    }
    if (assignee.value !== "all") {
      list = list.filter((s) => s.reporterId === assignee.value);
    }
    const q = query.value.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.pageUrl.toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (sort.value === "severity") {
        return (
          rank(b.severityCounts) - rank(a.severityCounts) ||
          b.pinCount - a.pinCount
        );
      }
      if (sort.value === "pins") return b.pinCount - a.pinCount;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return list;
  });

  return { status, severity, assignee, query, sort, view, counts, filtered };
}
