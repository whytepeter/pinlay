<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Brand,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Input,
  Label,
  Separator,
} from "@pinlay/design";
import { useShell } from "@/shared/composables/useShell";
import { BOARD_COLORS, useBoards } from "@/shared/composables/useBoards";
import { useAuth } from "@/shared/composables/useAuth";
import type { Board } from "@/shared/lib/api";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import WorkspaceSwitcher from "./WorkspaceSwitcher.vue";

const route = useRoute();
const router = useRouter();
const { mobileOpen, closeMobile } = useShell();
const {
  boards,
  activeBoardId,
  boardCounts,
  addBoard,
  updateBoard,
  removeBoard,
  isPending: boardsPending,
  isError: boardsError,
  isCreating: boardCreating,
  isUpdating: boardUpdating,
} = useBoards();
const { user, logout } = useAuth();

const accountMenuOpen = ref(false);
const displayName = computed(
  () => user.value?.name || user.value?.email || "Account"
);

function goProfile() {
  void router.push({ name: "settings", params: { section: "profile" } });
  closeMobile();
  accountMenuOpen.value = false;
}

async function onLogout() {
  logout();
  await router.push({ name: "login" });
}

/**
 * Hover-expand on desktop. Stays expanded while a menu is open (so clicking the
 * workspace / help menu / new-board dialog — which portal outside the sidebar
 * — doesn't collapse it). On mobile the drawer (mobileOpen) is the expanded
 * state.
 */
const hovered = ref(false);
const wsMenuOpen = ref(false);
const newBoardOpen = ref(false);
const editBoardOpen = ref(false);
// Track which row's kebab is open so its action button is visible while the
// menu is mounted (otherwise the dropdown unmounts the moment the cursor
// leaves the row).
const openMenuBoardId = ref<string | null>(null);
const expanded = computed(
  () =>
    hovered.value ||
    mobileOpen.value ||
    wsMenuOpen.value ||
    accountMenuOpen.value ||
    newBoardOpen.value ||
    editBoardOpen.value ||
    openMenuBoardId.value !== null,
);

const nav = [
  { name: "Pinboards", to: "/", icon: "panels-top-left" },
  // { name: "Dashboard", to: "/overview", icon: "bar-chart-3" },
  { name: "Integrations", to: "/integrations", icon: "plug" },
  { name: "Settings", to: "/settings", icon: "settings" },
];

const newBoard = reactive<{ name: string; color: string }>({
  name: "",
  color: BOARD_COLORS[0]!,
});

async function submitNewBoard() {
  if (!newBoard.name.trim() || boardCreating.value) return;
  try {
    await addBoard(newBoard.name, newBoard.color);
    // Reset + close only AFTER the server confirms. On failure the dialog
    // stays open with the typed name so the user can correct + retry — the
    // error toast comes from useBoards' mutation.onError.
    newBoard.name = "";
    newBoard.color = BOARD_COLORS[0]!;
    newBoardOpen.value = false;
  } catch {
    /* error toast already surfaced by the mutation; keep dialog open */
  }
}

// ── Edit board ──────────────────────────────────────────────────────────
const editingBoardId = ref<string | null>(null);
const editDraft = reactive<{ name: string; color: string }>({
  name: "",
  color: BOARD_COLORS[0]!,
});

function openEditBoard(b: Board) {
  editingBoardId.value = b.id;
  editDraft.name = b.name;
  editDraft.color = b.color;
  editBoardOpen.value = true;
  openMenuBoardId.value = null;
}

const editDirty = computed(() => {
  const id = editingBoardId.value;
  if (!id) return false;
  const original = boards.value.find((b) => b.id === id);
  if (!original) return false;
  return (
    editDraft.name.trim() !== original.name ||
    editDraft.color !== original.color
  );
});

async function submitEditBoard() {
  const id = editingBoardId.value;
  if (!id || !editDraft.name.trim() || boardUpdating.value) return;
  if (!editDirty.value) {
    editBoardOpen.value = false;
    return;
  }
  try {
    await updateBoard(id, {
      name: editDraft.name.trim(),
      color: editDraft.color,
    });
    editBoardOpen.value = false;
    editingBoardId.value = null;
  } catch {
    /* error toast already surfaced; keep dialog open for retry */
  }
}

function onDeleteBoard(b: Board) {
  openMenuBoardId.value = null;
  removeBoard(b.id);
}

function isActive(to: string) {
  // Pinboards (/) stays highlighted on issue detail (/s/:id) — it's a child view.
  if (to === "/") return route.path === "/" || route.path.startsWith("/s/");
  return route.path.startsWith(to);
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-16 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width,transform,box-shadow] duration-200 ease-out"
    :class="[
      expanded ? 'w-64 shadow-xl' : 'w-16',
      mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
    ]"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- brand -->
    <div
      class="flex h-14 items-center gap-2.5 px-4"
      :class="expanded ? '' : 'justify-center px-0'"
    >
      <span class="flex shrink-0 items-center justify-center rounded-lg">
        <Brand :size="24" class="text-primary" />
      </span>
      <span
        v-show="expanded"
        class="whitespace-nowrap text-[15px] font-semibold tracking-tight"
        >pinlay</span
      >
      <span
        v-show="expanded"
        class="ml-auto whitespace-nowrap font-mono text-[10px] text-muted-foreground"
        >v0.1</span
      >
    </div>

    <!-- workspace -->
    <div class="px-2.5 pt-1">
      <WorkspaceSwitcher
        :collapsed="!expanded"
        @update:open="wsMenuOpen = $event"
      />
    </div>

    <!-- nav -->
    <nav class="mt-4 flex flex-col gap-1 px-2.5">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="relative flex h-9 items-center gap-3 rounded-md text-sm transition-colors"
        :class="[
          isActive(item.to)
            ? 'font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground',
          expanded ? 'px-2.5' : 'justify-center px-0',
        ]"
        :title="!expanded ? item.name : undefined"
        @click="closeMobile"
      >
        <Icon
          :name="item.icon"
          :size="18"
          class="shrink-0"
          :class="isActive(item.to) ? 'text-primary' : ''"
        />
        <span v-show="expanded" class="whitespace-nowrap">{{ item.name }}</span>
      </RouterLink>
    </nav>

    <!-- boards quick-list -->
    <div v-show="expanded" class="mt-7 px-2.5">
      <div class="flex items-center justify-between px-2.5 pb-1.5">
        <span
          class="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
          >Boards</span
        >
        <button
          class="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          title="New board"
          @click="newBoardOpen = true"
        >
          <Icon name="plus" :size="14" />
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <!-- loading skeleton: tiny rows so the layout doesn't jump -->
        <template v-if="boardsPending">
          <div
            v-for="i in 2"
            :key="`sk-${i}`"
            class="flex h-8 items-center gap-3 px-2.5"
          >
            <span class="size-2 shrink-0 rounded-full bg-muted" />
            <span class="h-2.5 flex-1 rounded bg-muted" />
          </div>
        </template>
        <p
          v-else-if="boardsError"
          class="px-2.5 py-1 text-[11px] text-destructive"
        >
          Couldn't load boards.
        </p>
        <p
          v-else-if="boards.length === 0"
          class="px-2.5 py-1 text-[11px] text-muted-foreground/70"
        >
          No boards yet.
        </p>
        <!-- Each board row carries a hover-revealed kebab. The link still
             spans the whole row; the kebab sits ABOVE it (z-10) so clicking
             it doesn't navigate. -->
        <div
          v-for="b in boards"
          :key="b.id"
          class="group relative"
        >
          <RouterLink
            :to="{ path: '/', query: { board: b.slug } }"
            class="flex h-8 items-center gap-3 rounded-md pl-2.5 pr-2 text-sm transition-colors"
            :class="
              activeBoardId === b.id
                ? 'bg-sidebar-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
            "
            @click="closeMobile"
          >
            <span
              class="size-2 shrink-0 rounded-full"
              :style="{ background: b.color }"
            />
            <span class="flex-1 truncate whitespace-nowrap">{{ b.name }}</span>
            <!-- Count peeks out when the kebab isn't shown; gets visually
                 replaced by the kebab on hover via the group selectors. -->
            <span
              class="font-mono text-[11px] text-muted-foreground/70"
              :class="
                openMenuBoardId === b.id
                  ? 'opacity-0'
                  : 'group-hover:opacity-0'
              "
            >
              {{ boardCounts[b.id] ?? 0 }}
            </span>
          </RouterLink>

          <!-- Kebab — absolutely positioned so it doesn't shift the row,
               visible on hover or when its own menu is open. -->
          <DropdownMenu
            :open="openMenuBoardId === b.id"
            @update:open="(o) => (openMenuBoardId = o ? b.id : null)"
          >
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-muted/60 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="
                  openMenuBoardId === b.id
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                "
                :title="`${b.name} actions`"
                :aria-label="`${b.name} actions`"
                @click.prevent.stop
              >
                <Icon name="ellipsis" :size="14" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-44">
              <DropdownMenuItem @select="openEditBoard(b)">
                <Icon name="pencil" :size="14" /> Rename / recolor
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="text-destructive"
                @select="onDeleteBoard(b)"
              >
                <Icon name="trash-2" :size="14" /> Delete board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>

    <!-- new board dialog -->
    <Dialog v-model:open="newBoardOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New board</DialogTitle>
          <DialogDescription>
            Group sessions by page, feature, or any slice you triage together.
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-4 py-2">
          <div class="grid gap-2">
            <Label for="board-name">Name</Label>
            <Input
              id="board-name"
              v-model="newBoard.name"
              placeholder="e.g. Onboarding flow"
              autocomplete="off"
              :disabled="boardCreating"
              @keydown.enter="submitNewBoard"
            />
          </div>
          <div class="grid gap-2">
            <Label>Color</Label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in BOARD_COLORS"
                :key="c"
                type="button"
                class="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                :class="
                  newBoard.color === c
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : ''
                "
                :style="{ background: c }"
                :title="`Pick ${c}`"
                :aria-label="`Pick color ${c}`"
                :aria-pressed="newBoard.color === c"
                :disabled="boardCreating"
                @click="newBoard.color = c"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            :disabled="boardCreating"
            @click="newBoardOpen = false"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            :disabled="!newBoard.name.trim() || boardCreating"
            @click="submitNewBoard"
          >
            <Icon
              v-if="boardCreating"
              name="loader-circle"
              :size="14"
              class="animate-spin"
            />
            {{ boardCreating ? "Creating…" : "Create board" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- edit board dialog (rename + recolor) -->
    <Dialog v-model:open="editBoardOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit board</DialogTitle>
          <DialogDescription>
            Rename or recolor this board. Issues stay where they are.
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-4 py-2">
          <div class="grid gap-2">
            <Label for="edit-board-name">Name</Label>
            <Input
              id="edit-board-name"
              v-model="editDraft.name"
              autocomplete="off"
              :disabled="boardUpdating"
              @keydown.enter="submitEditBoard"
            />
          </div>
          <div class="grid gap-2">
            <Label>Color</Label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="c in BOARD_COLORS"
                :key="c"
                type="button"
                class="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                :class="
                  editDraft.color === c
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : ''
                "
                :style="{ background: c }"
                :title="`Pick ${c}`"
                :aria-label="`Pick color ${c}`"
                :aria-pressed="editDraft.color === c"
                :disabled="boardUpdating"
                @click="editDraft.color = c"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            :disabled="boardUpdating"
            @click="editBoardOpen = false"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            :disabled="!editDraft.name.trim() || !editDirty || boardUpdating"
            @click="submitEditBoard"
          >
            <Icon
              v-if="boardUpdating"
              name="loader-circle"
              :size="14"
              class="animate-spin"
            />
            {{ boardUpdating ? "Saving…" : "Save changes" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div class="flex-1" />

    <Separator />

    <!-- footer: account menu. Trigger shows the user; the user-info row
         INSIDE the popover is the link to Profile. Log out lives below. -->
    <div class="p-2.5">
      <DropdownMenu v-model:open="accountMenuOpen">
        <DropdownMenuTrigger as-child>
          <button
            class="flex h-10 items-center gap-2.5 rounded-md text-left text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            :class="
              expanded ? 'w-full px-2' : 'size-9 justify-center self-center'
            "
            :title="!expanded ? displayName : undefined"
          >
            <UserAvatar :name="displayName" :size="24" class="shrink-0" />
            <span
              v-show="expanded"
              class="flex min-w-0 flex-1 flex-col leading-tight"
            >
              <span class="truncate text-sm font-medium text-foreground">
                {{ displayName }}
              </span>
              <span
                v-if="user?.email && user.email !== displayName"
                class="truncate text-[11px] text-muted-foreground"
              >
                {{ user.email }}
              </span>
            </span>
            <Icon
              v-show="expanded"
              name="chevrons-up-down"
              :size="14"
              class="shrink-0 text-muted-foreground"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" class="w-56">
          <!-- The identity row IS the navigation: clicking it takes you to
               /settings/profile. Modelled as a DropdownMenuItem so it gets
               keyboard nav + the standard hover/focus chrome for free. -->
          <DropdownMenuItem class="gap-2.5 p-2" @select="goProfile">
            <span class="flex min-w-0 flex-1 flex-col leading-tight">
              <span class="truncate text-sm font-medium text-foreground">
                {{ displayName }}
              </span>
              <span
                v-if="user?.email"
                class="truncate text-[11px] text-muted-foreground"
              >
                {{ user.email }}
              </span>
            </span>
            <Icon
              name="chevron-right"
              :size="14"
              class="shrink-0 text-muted-foreground"
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="text-destructive focus:text-destructive"
            @select="onLogout"
          >
            <Icon name="log-out" :size="14" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </aside>
</template>
