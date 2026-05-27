import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { SESSIONS } from "@/shared/lib/data";

export interface Board {
  id: string;
  name: string;
  color: string;
}

// Module-level so AppSidebar and PinboardsPage share the same source.
const boards = ref<Board[]>([
  { id: "checkout", name: "Checkout", color: "#3fcf8e" },
  { id: "marketing", name: "Marketing site", color: "#0d9488" },
  { id: "mobile", name: "Mobile web", color: "#f97316" },
]);

// Preset colors offered in the "New board" dialog (curated, not the full
// severity palette so boards don't clash with severity reads).
export const BOARD_COLORS = [
  "#7c3aed", // violet
  "#3fcf8e", // green
  "#0d9488", // teal
  "#f97316", // orange
  "#ef4444", // red
  "#eab308", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
];

export function useBoards() {
  const route = useRoute();

  const activeBoardId = computed<string | null>(() => {
    const q = route.query.board;
    if (typeof q === "string" && boards.value.some((b) => b.id === q)) return q;
    return null;
  });
  const activeBoard = computed<Board | null>(() =>
    activeBoardId.value
      ? (boards.value.find((b) => b.id === activeBoardId.value) ?? null)
      : null,
  );

  // Live count of sessions per board id (derived from mock data). When the API
  // lands, replace this with a real aggregate query.
  const boardCounts = computed<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    for (const s of SESSIONS) {
      if (s.boardId) acc[s.boardId] = (acc[s.boardId] ?? 0) + 1;
    }
    return acc;
  });

  function addBoard(name: string, color: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (boards.value.some((b) => b.id === id)) return;
    boards.value.push({ id, name: trimmed, color });
  }
  function removeBoard(id: string) {
    boards.value = boards.value.filter((b) => b.id !== id);
  }

  return {
    boards,
    activeBoardId,
    activeBoard,
    boardCounts,
    addBoard,
    removeBoard,
  };
}
