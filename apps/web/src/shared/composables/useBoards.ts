import { computed } from "vue";
import { useRoute } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  apiClient,
  type Board,
  type CreateBoardInput,
  type UpdateBoardInput,
} from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import { confirm } from "@/shared/lib/confirm";

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

/**
 * Boards = workspace-scoped groupings backed by the /api/boards module.
 * Active board is derived from the `?board=` URL query so links + browser
 * back/forward Just Work.
 */
export function useBoards() {
  const route = useRoute();
  const queryClient = useQueryClient();

  const boardsQuery = useQuery({
    queryKey: ["boards"],
    queryFn: () => apiClient.boards.list(),
  });

  const boards = computed<Board[]>(() => boardsQuery.data.value ?? []);

  /**
   * The active board is keyed by SLUG (not id) in the URL so links read
   * nicely: `/?board=checkout`. The board model already enforces slug
   * uniqueness within a workspace, so slug → board is unambiguous.
   */
  const activeBoardSlug = computed<string | null>(() => {
    const q = route.query.board;
    if (typeof q === "string" && boards.value.some((b) => b.slug === q)) {
      return q;
    }
    return null;
  });

  const activeBoard = computed<Board | null>(() => {
    if (!activeBoardSlug.value) return null;
    return boards.value.find((b) => b.slug === activeBoardSlug.value) ?? null;
  });

  // Lookup of issue-counts per board id (denormalised on the wire so the
  // sidebar doesn't need a separate count query). Kept under the same name
  // the previous mock used so callers don't have to change.
  const boardCounts = computed<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    for (const b of boards.value) acc[b.id] = b.issueCount;
    return acc;
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["boards"] });
    // Issue cards embed `board` — refresh feeds so renamed/removed boards
    // propagate without a full page reload.
    queryClient.invalidateQueries({ queryKey: ["issues", "list"] });
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateBoardInput) => apiClient.boards.create(input),
    onSuccess: (b) => {
      invalidate();
      toast.success(`Created ${b.name}`);
    },
    onError: (err) => toast.error(err),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiClient.boards.remove(id),
    onSuccess: (_, id) => {
      const removed = boards.value.find((b) => b.id === id);
      invalidate();
      toast.success(removed ? `Removed ${removed.name}` : "Board removed");
    },
    onError: (err) => toast.error(err),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBoardInput }) =>
      apiClient.boards.update(id, patch),
    onSuccess: (b) => {
      invalidate();
      toast.success(`Updated ${b.name}`);
    },
    onError: (err) => toast.error(err),
  });

  /**
   * Returns a Promise that resolves with the new Board on success or rejects
   * on failure — lets the caller (e.g. the New Board dialog) keep itself
   * open + spinning until the server actually acknowledges, then close on
   * success / surface the error inline on failure.
   */
  async function addBoard(name: string, color: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required");
    return createMutation.mutateAsync({ name: trimmed, color });
  }
  function removeBoard(id: string) {
    return confirm({
      title: "Remove this board?",
      message: "Its issues stay — they just become unassigned.",
      confirmLabel: "Remove board",
      variant: "destructive",
      onConfirm: () => removeMutation.mutateAsync(id),
    });
  }

  /**
   * Returns a Promise so dialogs can keep their loading state visible until
   * the server acknowledges (same pattern as addBoard).
   */
  async function updateBoard(id: string, patch: UpdateBoardInput) {
    return updateMutation.mutateAsync({ id, patch });
  }

  return {
    boards,
    activeBoardId: computed(() => activeBoard.value?.id ?? null),
    activeBoardSlug,
    activeBoard,
    boardCounts,
    isPending: computed(() => boardsQuery.isPending.value),
    isError: computed(() => boardsQuery.isError.value),
    addBoard,
    removeBoard,
    updateBoard,
    isCreating: computed(() => createMutation.isPending.value),
    isUpdating: computed(() => updateMutation.isPending.value),
    isRemoving: computed(() => removeMutation.isPending.value),
  };
}
