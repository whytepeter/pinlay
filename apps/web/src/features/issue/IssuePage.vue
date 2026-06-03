<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { toast } from "@/shared/lib/toast";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@pinlay/design";
import Favicon from "@/shared/components/Favicon.vue";
import {
  apiClient,
  type IssueDetail,
  type IssueSummary,
  type UpdateIssueInput,
} from "@/shared/lib/api";
import type { Status } from "@pinlay/shared";
import { issueDisplay } from "@/shared/lib/issue-display";
import { useIssue } from "./composables/useIssue";
import PinList from "./components/PinList.vue";
import PinDetail from "./components/PinDetail.vue";
import IssuePageSkeleton from "./components/IssuePageSkeleton.vue";

const route = useRoute();
const issueId = computed(() => String(route.params.id));
const {
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
  isPending,
  isError,
  refetch,
} = useIssue(issueId);

// Workspace members feed the pin assignee dropdown.
const membersQuery = useQuery({
  queryKey: ["workspace", "members"],
  queryFn: () => apiClient.workspaces.members(),
});
const members = computed(() => membersQuery.data.value ?? []);

// Boards feed the issue's board-assignment dropdown in the header.
const boardsQuery = useQuery({
  queryKey: ["boards"],
  queryFn: () => apiClient.boards.list(),
});
const boards = computed(() => boardsQuery.data.value ?? []);

const queryClient = useQueryClient();

/**
 * Single mutation handles every issue patch (board / status / title). The
 * cache is updated optimistically with whichever fields are in the patch;
 * a snapshot is captured for rollback on error. Toast copy depends on
 * which field changed.
 */
const updateIssueMutation = useMutation({
  mutationFn: (input: UpdateIssueInput) =>
    apiClient.issues.update(issueId.value, input),
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: ["issue", issueId.value] });
    const previous = queryClient.getQueryData<IssueDetail>([
      "issue",
      issueId.value,
    ]);
    if (previous) {
      const patched: IssueDetail = { ...previous };
      if (input.boardId !== undefined) {
        const next =
          input.boardId === null
            ? null
            : (boards.value.find((b) => b.id === input.boardId) ?? null);
        patched.board = next
          ? { id: next.id, name: next.name, slug: next.slug, color: next.color }
          : null;
      }
      if (typeof input.title === "string") patched.title = input.title;
      if (input.status !== undefined) patched.status = input.status;
      queryClient.setQueryData<IssueDetail>(["issue", issueId.value], patched);
    }
    return { previous, input };
  },
  onError: (err, _vars, ctx) => {
    if (ctx?.previous) {
      queryClient.setQueryData(["issue", issueId.value], ctx.previous);
    }
    toast.error(err);
  },
  onSuccess: (next: IssueSummary, vars) => {
    if (vars.boardId !== undefined) {
      toast.success(
        next.board ? `Moved to ${next.board.name}` : "Removed from board",
      );
    } else if (vars.status !== undefined) {
      toast.success(
        vars.status === "archived"
          ? "Issue archived"
          : `Status changed to ${vars.status.replace("_", " ")}`,
      );
    } else if (vars.title !== undefined) {
      toast.success("Issue renamed");
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["issue", issueId.value] });
    queryClient.invalidateQueries({ queryKey: ["issues", "list"] });
    queryClient.invalidateQueries({ queryKey: ["issues", "counts"] });
    queryClient.invalidateQueries({ queryKey: ["boards"] });
  },
});

function setBoard(boardId: string | null) {
  updateIssueMutation.mutate({ boardId });
}
function setIssueStatus(s: Status) {
  if (session.value?.status === s) return;
  updateIssueMutation.mutate({ status: s });
}
function renameIssue(title: string) {
  const trimmed = title.trim();
  if (!trimmed || trimmed === session.value?.title) {
    titleEditing.value = false;
    return;
  }
  updateIssueMutation.mutate({ title: trimmed });
  titleEditing.value = false;
}

// Title click-to-edit state. Local draft + a flag so the input replaces
// the <span> while editing; commits on blur / Enter, reverts on Escape.
const titleEditing = ref(false);
const titleDraft = ref("");
function startTitleEdit() {
  if (!session.value) return;
  titleDraft.value = session.value.title;
  titleEditing.value = true;
}
function cancelTitleEdit() {
  titleEditing.value = false;
}

// Status chip metadata: visible label + colour token per status. The four
// non-draft entries are surfaced in the dropdown; draft is rendered as
// fallback only.
const STATUS_META: Record<
  Status,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "var(--status-open)" },
  in_progress: { label: "In progress", color: "var(--status-progress)" },
  resolved: { label: "Resolved", color: "var(--status-resolved)" },
  archived: { label: "Archived", color: "var(--muted-foreground)" },
  draft: { label: "Draft", color: "var(--muted-foreground)" },
};
const STATUS_OPTIONS: Status[] = ["open", "in_progress", "resolved", "archived"];
const currentStatusMeta = computed(() => {
  const s = session.value?.status;
  return s ? STATUS_META[s] : STATUS_META.open;
});

const display = computed(() =>
  session.value ? issueDisplay(session.value) : null,
);

watch(
  () => isError.value,
  (errored) => {
    if (errored) toast.error("Couldn't load this issue.");
  },
);

const mobilePane = ref<"list" | "detail">("list");
function onSelect(i: number) {
  select(i);
  mobilePane.value = "detail";
}

function copyLink() {
  try {
    navigator.clipboard?.writeText(window.location.href);
  } catch {
    /* clipboard unavailable */
  }
}
function openOnPage() {
  if (session.value) window.open(session.value.pageUrl, "_blank", "noopener");
}
</script>

<template>
  <!-- Skeleton substitutes the whole page (own header + rail + detail
       panel) so the layout doesn't pop in chunks. -->
  <IssuePageSkeleton v-if="isPending" />
  <div v-else class="flex h-screen flex-col bg-background text-foreground">
    <!-- header -->
    <header class="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <RouterLink to="/">
        <Button variant="ghost" size="sm">
          <Icon name="arrow-left" :size="14" /> Issues
        </Button>
      </RouterLink>
      <Icon
        name="chevron-right"
        :size="14"
        class="hide-mobile text-muted-foreground"
      />
      <span class="hide-mobile font-mono text-xs text-muted-foreground">{{
        session?.reference
      }}</span>

      <div class="flex min-w-0 flex-1 items-center gap-1.5">
        <Favicon
          v-if="session && display"
          :label="display.faviconLabel"
          :hue="display.faviconHue"
          :size="15"
        />
        <!-- Title: click-to-edit. Commits on Enter or blur, reverts on Esc. -->
        <input
          v-if="titleEditing"
          v-model="titleDraft"
          class="min-w-0 flex-1 truncate rounded border border-input bg-card px-2 py-0.5 text-sm font-medium outline-none focus-visible:border-ring"
          :disabled="updateIssueMutation.isPending.value"
          autofocus
          @keydown.enter.prevent="renameIssue(titleDraft)"
          @keydown.escape.prevent="cancelTitleEdit"
          @blur="renameIssue(titleDraft)"
        />
        <button
          v-else
          type="button"
          class="group flex min-w-0 flex-1 items-center gap-1.5 truncate rounded px-1 py-0.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          :disabled="!session"
          :title="session?.title ? 'Click to rename' : ''"
          @click="startTitleEdit"
        >
          <span class="truncate">{{ session?.title }}</span>
          <Icon
            name="pencil"
            :size="11"
            class="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </button>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Status chip — issue-level status (Open / In progress / Resolved /
             Archived). Selecting Archived hides the issue from the default
             feed. Pin-level status is separate (per-pin dropdown). -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="hidden gap-1.5 md:inline-flex"
              :disabled="!session || updateIssueMutation.isPending.value"
            >
              <span
                class="size-1.5 shrink-0 rounded-full"
                :style="{ background: currentStatusMeta.color }"
              />
              <span>{{ currentStatusMeta.label }}</span>
              <Icon
                name="chevron-down"
                :size="13"
                class="text-muted-foreground"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-44">
            <DropdownMenuItem
              v-for="s in STATUS_OPTIONS"
              :key="s"
              @click="setIssueStatus(s)"
            >
              <span
                class="size-2 shrink-0 rounded-full"
                :style="{ background: STATUS_META[s].color }"
              />
              <span class="flex-1">{{ STATUS_META[s].label }}</span>
              <Icon
                v-if="session?.status === s"
                name="check"
                :size="14"
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Board chip — current board (or "Add to board") + dropdown to
             move / unassign. Hidden on the smallest viewport to keep the
             header from overflowing; still reachable through the overflow
             menu in a future iteration. -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="outline"
              size="sm"
              class="hidden gap-1.5 md:inline-flex"
              :disabled="
                !session ||
                boardsQuery.isPending.value ||
                updateIssueMutation.isPending.value
              "
            >
              <Icon
                v-if="updateIssueMutation.isPending.value"
                name="loader-circle"
                :size="14"
                class="animate-spin"
              />
              <template v-else-if="session?.board">
                <span
                  class="size-1.5 shrink-0 rounded-full"
                  :style="{ background: session.board.color }"
                />
                {{ session.board.name }}
              </template>
              <template v-else>
                <Icon name="layout-grid" :size="14" /> Add to board
              </template>
              <Icon
                name="chevron-down"
                :size="13"
                class="text-muted-foreground"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuItem
              v-for="b in boards"
              :key="b.id"
              @click="setBoard(b.id)"
            >
              <span
                class="size-2 shrink-0 rounded-full"
                :style="{ background: b.color }"
              />
              <span class="min-w-0 flex-1 truncate">{{ b.name }}</span>
              <Icon
                v-if="session?.board?.id === b.id"
                name="check"
                :size="14"
              />
            </DropdownMenuItem>
            <template v-if="boards.length > 0 && session?.board">
              <DropdownMenuSeparator />
            </template>
            <DropdownMenuItem
              v-if="session?.board"
              @click="setBoard(null)"
            >
              <Icon name="x" :size="14" /> Remove from board
            </DropdownMenuItem>
            <div
              v-if="boards.length === 0 && !boardsQuery.isPending.value"
              class="px-2 py-2 text-xs text-muted-foreground"
            >
              No boards yet. Create one in the sidebar.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          class="hidden md:inline-flex"
          @click="copyLink"
        >
          <Icon name="link" :size="14" /> Copy link
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="hidden md:inline-flex"
          title="Open the synced Linear issue (coming soon)"
        >
          <Icon name="external-link" :size="14" /> View in Linear
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="md:hidden" title="More">
              <Icon name="ellipsis" :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="copyLink"
              ><Icon name="link" :size="14" /> Copy link</DropdownMenuItem
            >
            <DropdownMenuItem
              ><Icon name="external-link" :size="14" /> View in Linear</DropdownMenuItem
            >
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" :disabled="!session" @click="openOnPage">
          <Icon name="square-arrow-out-up-right" :size="14" />
          <span class="hide-mobile">Open on page</span>
        </Button>
      </div>
    </header>

    <!-- mobile pane switcher -->
    <Tabs v-model="mobilePane" class="border-b px-3 py-2 md:hidden">
      <TabsList class="w-full">
        <TabsTrigger value="list" class="flex-1">Pins</TabsTrigger>
        <TabsTrigger value="detail" class="flex-1">Detail</TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- body — isPending is handled by the top-level <IssuePageSkeleton>;
         this block only renders for terminal states (error / not found /
         loaded). -->
    <div
      v-if="isError"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <span
        class="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <Icon name="triangle-alert" :size="22" />
      </span>
      <p class="text-sm text-foreground">Couldn't load this issue.</p>
      <Button variant="outline" size="sm" @click="refetch">Try again</Button>
    </div>
    <div
      v-else-if="!session"
      class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
    >
      Issue not found.
    </div>
    <div v-else-if="selected" class="flex min-h-0 flex-1">
      <div
        class="w-full shrink-0 flex-col border-r md:flex md:w-[340px]"
        :class="mobilePane === 'list' ? 'flex' : 'hidden'"
      >
        <PinList
          :session="session"
          :pins="pins"
          :selected-index="selectedIndex"
          @select="onSelect"
        />
      </div>
      <div
        class="min-w-0 flex-1 flex-col md:flex"
        :class="mobilePane === 'detail' ? 'flex' : 'hidden'"
      >
        <PinDetail
          :pin="selected"
          :index="selectedIndex"
          :total="pins.length"
          :members="members"
          @next="next"
          @prev="prev"
          @set-status="setStatus"
          @set-assignee="setAssignee"
          @set-labels="setLabels"
        />
      </div>
    </div>
    <div
      v-else
      class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
    >
      This issue has no pins yet.
    </div>
  </div>
</template>
