/**
 * Pin Inbox server state — one composable per domain (project convention).
 * Wraps the pin-centric read surface (`GET /pins*`) plus the pin write
 * surface the detail page needs (status / assignee / labels / delete).
 *
 * Mutations invalidate; they never re-fetch manually.
 */
import { computed, type Ref } from "vue";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import type { Status } from "@pinlay/shared";
import {
  apiClient,
  type InboxState,
  type UpdatePinInput,
} from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

const PAGE_SIZE = 50;

export interface InboxFilters {
  state: Ref<InboxState>;
  site: Ref<string | null>;
  q: Ref<string>;
}

export function usePinInbox(filters: InboxFilters) {
  const baseParams = computed(() => ({
    state: filters.state.value,
    ...(filters.site.value ? { site: filters.site.value } : {}),
    ...(filters.q.value.trim() ? { q: filters.q.value.trim() } : {}),
    limit: PAGE_SIZE,
  }));

  // Infinite query so "Load more" APPENDS pages instead of swapping them.
  // The key embeds the filters, so any filter change starts a fresh list.
  const query = useInfiniteQuery({
    queryKey: computed(() => ["pins", "inbox", baseParams.value] as const),
    queryFn: ({ pageParam }) =>
      apiClient.pins.inbox({ ...baseParams.value, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.limit;
      return next < last.total ? next : undefined;
    },
  });

  const pins = computed(
    () => query.data.value?.pages.flatMap((p) => p.items) ?? [],
  );
  const total = computed(() => query.data.value?.pages[0]?.total ?? 0);

  const sites = useQuery({
    queryKey: ["pins", "sites"] as const,
    queryFn: () => apiClient.pins.sites(),
    staleTime: 60_000,
  });

  return { query, pins, total, sites };
}

export function usePinDetail(pinId: Ref<string>) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: computed(() => ["pin", pinId.value] as const),
    queryFn: () => apiClient.pins.get(pinId.value),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["pin", pinId.value] });
    void queryClient.invalidateQueries({ queryKey: ["pins"] });
  }

  const update = useMutation({
    mutationFn: (patch: UpdatePinInput) =>
      apiClient.pins.update(pinId.value, patch),
    onSuccess: invalidate,
    onError: (err) => toast.error(err),
  });

  const remove = useMutation({
    mutationFn: () => apiClient.pins.remove(pinId.value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pins"] });
    },
    onError: (err) => toast.error(err),
  });

  function setStatus(status: Status) {
    update.mutate({ status });
  }
  function setAssignee(assigneeId: string | null) {
    update.mutate({ assigneeId });
  }
  function setLabels(labels: string[]) {
    update.mutate({ labels });
  }

  return { query, update, remove, setStatus, setAssignee, setLabels };
}
