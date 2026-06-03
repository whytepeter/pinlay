import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { Status } from "@pinlay/shared";
import { apiClient, type ApiPin, type MemberRef } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

export function useIssue(issueId: Ref<string>) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: computed(() => ["issue", issueId.value]),
    queryFn: () => apiClient.issues.get(issueId.value),
    enabled: computed(() => !!issueId.value),
  });

  const session = computed(() => query.data.value ?? null);

  // Local pins ref seeded from the fetched detail. Holding it as a ref (not a
  // recomputed getter) so optimistic mutations are visible immediately while
  // the PATCH is in flight. The seed DEEP-CLONES because vue-query returns
  // its cached data as a readonly proxy — direct mutation of nested fields
  // (status / assignee / labels) would otherwise trigger a Vue "set on
  // readonly" warning and silently no-op.
  const pins = ref<ApiPin[]>([]);
  watch(
    () => query.data.value?.pins,
    (next) => {
      pins.value = next
        ? next.map((p) => ({ ...p, labels: [...p.labels] }))
        : [];
    },
    { immediate: true },
  );

  const selectedIndex = ref(0);
  watch(issueId, () => {
    selectedIndex.value = 0;
  });
  watch(pins, (list) => {
    if (selectedIndex.value >= list.length) selectedIndex.value = 0;
  });

  const selected = computed<ApiPin | undefined>(
    () => pins.value[selectedIndex.value],
  );

  function select(i: number) {
    if (i >= 0 && i < pins.value.length) selectedIndex.value = i;
  }
  function next() {
    select(Math.min(selectedIndex.value + 1, pins.value.length - 1));
  }
  function prev() {
    select(Math.max(selectedIndex.value - 1, 0));
  }

  const updatePin = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof apiClient.pins.update>[1] }) =>
      apiClient.pins.update(id, patch),
    onSettled: () => {
      // Refresh detail (also pulls issue-level rollups like statusCounts).
      queryClient.invalidateQueries({ queryKey: ["issue", issueId.value] });
      // List view aggregates per-pin status into the issue card.
      queryClient.invalidateQueries({ queryKey: ["issues", "list"] });
    },
  });

  function setStatus(s: Status) {
    const p = selected.value;
    if (!p) return;
    const prev = p.status;
    p.status = s; // optimistic
    updatePin.mutate(
      { id: p.id, patch: { status: s } },
      {
        onError: (err) => {
          p.status = prev; // revert
          toast.error(err);
        },
      },
    );
  }

  function setAssignee(member: MemberRef | null) {
    const p = selected.value;
    if (!p) return;
    const prev = p.assignee;
    p.assignee = member; // optimistic
    updatePin.mutate(
      { id: p.id, patch: { assigneeId: member ? member.id : null } },
      {
        onError: (err) => {
          p.assignee = prev; // revert
          toast.error(err);
        },
      },
    );
  }

  /**
   * Replace the selected pin's labels[]. Caller passes the full new list —
   * the API stores it as-is (no diff semantics). Empty array clears.
   */
  function setLabels(labels: string[]) {
    const p = selected.value;
    if (!p) return;
    const prev = p.labels;
    p.labels = labels; // optimistic
    updatePin.mutate(
      { id: p.id, patch: { labels } },
      {
        onError: (err) => {
          p.labels = prev; // revert
          toast.error(err);
        },
      },
    );
  }

  function onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    if (
      el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable)
    ) {
      return;
    }
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      next();
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      prev();
    }
  }

  onMounted(() => window.addEventListener("keydown", onKey));
  onUnmounted(() => window.removeEventListener("keydown", onKey));

  return {
    session,
    pins,
    selectedIndex,
    selected,
    select,
    next,
    prev,
    setStatus,
    setAssignee,
    setLabels,
    isPending: computed(() => query.isPending.value),
    isError: computed(() => query.isError.value),
    error: computed(() => query.error.value),
    refetch: () => query.refetch(),
  };
}
