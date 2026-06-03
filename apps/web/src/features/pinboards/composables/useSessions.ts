import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { Severity, Status } from "@pinlay/shared";
import { apiClient, type IssueSummary } from "@/shared/lib/api";
import { useBoards } from "@/shared/composables/useBoards";

export type ViewMode = "grid" | "list";
export type StatusFilter =
  | "all"
  | "open"
  | "in_progress"
  | "resolved"
  | "archived";
export type SeverityFilter = "all" | Severity;
export type SortMode = "recent" | "severity" | "pins";

const DEFAULT_PAGE_SIZE = 24;

export function useSessions() {
  const status = ref<StatusFilter>("all");
  const severity = ref<SeverityFilter>("all");
  /** Stores the reporter's userId (not the workspace-member-row id). */
  const assignee = ref<string>("all");
  const query = ref("");
  const sort = ref<SortMode>("recent");
  const view = ref<ViewMode>("grid");
  const page = ref(0); // 0-based; pageSize fixed for v1
  const pageSize = ref(DEFAULT_PAGE_SIZE);

  const { activeBoardId } = useBoards();

  /**
   * Reset to page 1 whenever a filter changes — otherwise you can land on
   * "page 5 of a 1-page result" after narrowing.
   */
  watch(
    [status, severity, assignee, query, activeBoardId, pageSize],
    () => {
      page.value = 0;
    },
  );

  const filterParams = computed(() => ({
    status: status.value === "all" ? undefined : (status.value as Status),
    severity:
      severity.value === "all" ? undefined : (severity.value as Severity),
    reporterId: assignee.value === "all" ? undefined : assignee.value,
    q: query.value.trim() || undefined,
    boardId: activeBoardId.value ?? undefined,
    // When the user explicitly picks the Archived tab we surface those
    // rows; everywhere else they're hidden by the server default.
    includeArchived:
      status.value === "archived" ? ("true" as const) : undefined,
  }));

  const listParams = computed(() => ({
    ...filterParams.value,
    limit: pageSize.value,
    offset: page.value * pageSize.value,
  }));

  const issuesQuery = useQuery({
    queryKey: ["issues", "list", listParams],
    queryFn: () => apiClient.issues.list(listParams.value),
  });

  // Counts query — honors filterParams but NOT status (server ignores it
  // anyway). Cached separately so paging doesn't refetch counts.
  const countsQuery = useQuery({
    queryKey: ["issues", "counts", filterParams],
    queryFn: () => apiClient.issues.counts(filterParams.value),
  });

  const items = computed<IssueSummary[]>(
    () => issuesQuery.data.value?.items ?? [],
  );

  const total = computed(() => issuesQuery.data.value?.total ?? 0);
  const totalPages = computed(() =>
    pageSize.value > 0 ? Math.max(1, Math.ceil(total.value / pageSize.value)) : 1,
  );
  const hasPrev = computed(() => page.value > 0);
  const hasNext = computed(() => page.value + 1 < totalPages.value);

  // Sorting — the API returns updatedAt-desc; the other two sorts apply
  // client-side on the loaded page. Good enough until the server exposes
  // sort params.
  const filtered = computed(() => {
    const list = items.value.slice();
    if (sort.value === "severity") {
      list.sort((a, b) => {
        const ra = rank(a.severityCounts);
        const rb = rank(b.severityCounts);
        return rb - ra || b.pinCount - a.pinCount;
      });
    } else if (sort.value === "pins") {
      list.sort((a, b) => b.pinCount - a.pinCount);
    }
    return list;
  });

  const counts = computed(() => {
    const c = countsQuery.data.value;
    return c ?? { all: 0, open: 0, in_progress: 0, resolved: 0, archived: 0 };
  });

  function nextPage() {
    if (hasNext.value) page.value += 1;
  }
  function prevPage() {
    if (hasPrev.value) page.value -= 1;
  }

  return {
    status,
    severity,
    assignee,
    query,
    sort,
    view,
    counts,
    filtered,
    page,
    pageSize,
    total,
    totalPages,
    hasPrev,
    hasNext,
    nextPage,
    prevPage,
    isPending: computed(() => issuesQuery.isPending.value),
    isFetching: computed(() => issuesQuery.isFetching.value),
    isError: computed(() => issuesQuery.isError.value),
    refetch: () => {
      void issuesQuery.refetch();
      void countsQuery.refetch();
    },
  };
}

// Severity ranking — lifted from the old client-side sort path.
const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};
function rank(counts: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}): number {
  let max = 0;
  if (counts.critical > 0) max = Math.max(max, SEVERITY_WEIGHT.critical);
  if (counts.high > 0) max = Math.max(max, SEVERITY_WEIGHT.high);
  if (counts.medium > 0) max = Math.max(max, SEVERITY_WEIGHT.medium);
  if (counts.low > 0) max = Math.max(max, SEVERITY_WEIGHT.low);
  return max;
}
