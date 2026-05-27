import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { Status } from "@pinlay/shared";
import {
  getPins,
  SESSIONS,
  type PinItem,
  type SessionListItem,
} from "@/shared/lib/data";

export function useIssue(sessionId: Ref<string>) {
  const session = computed<SessionListItem | undefined>(() =>
    SESSIONS.find((s) => s.id === sessionId.value),
  );

  // Held in a ref (not a recomputed getter) so edits to status/assignee stick.
  const pins = ref<PinItem[]>(getPins(sessionId.value));
  const selectedIndex = ref(0);
  watch(sessionId, (id) => {
    pins.value = getPins(id);
    selectedIndex.value = 0;
  });

  const selected = computed<PinItem | undefined>(
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

  function setStatus(s: Status) {
    const p = selected.value;
    if (p) p.status = s;
  }
  function setAssignee(id: string) {
    const p = selected.value;
    if (p) p.assigneeId = id;
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
  };
}
