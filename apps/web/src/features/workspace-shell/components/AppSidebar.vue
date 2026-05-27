<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute } from "vue-router";
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
import WorkspaceSwitcher from "./WorkspaceSwitcher.vue";

const route = useRoute();
const { mobileOpen, closeMobile } = useShell();
const { boards, activeBoardId, boardCounts, addBoard } = useBoards();

/**
 * Hover-expand on desktop. Stays expanded while a menu is open (so clicking the
 * workspace / help menu / new-board dialog — which portal outside the sidebar
 * — doesn't collapse it). On mobile the drawer (mobileOpen) is the expanded
 * state.
 */
const hovered = ref(false);
const wsMenuOpen = ref(false);
const helpMenuOpen = ref(false);
const newBoardOpen = ref(false);
const expanded = computed(
  () =>
    hovered.value ||
    mobileOpen.value ||
    wsMenuOpen.value ||
    helpMenuOpen.value ||
    newBoardOpen.value,
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

function submitNewBoard() {
  if (!newBoard.name.trim()) return;
  addBoard(newBoard.name, newBoard.color);
  newBoard.name = "";
  newBoard.color = BOARD_COLORS[0]!;
  newBoardOpen.value = false;
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
        <RouterLink
          v-for="b in boards"
          :key="b.id"
          :to="{ path: '/', query: { board: b.id } }"
          class="flex h-8 items-center gap-3 rounded-md px-2.5 text-sm transition-colors"
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
          <span class="font-mono text-[11px] text-muted-foreground/70">
            {{ boardCounts[b.id] ?? 0 }}
          </span>
        </RouterLink>
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
                class="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110"
                :class="
                  newBoard.color === c
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : ''
                "
                :style="{ background: c }"
                :title="c"
                @click="newBoard.color = c"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" @click="newBoardOpen = false">
            Cancel
          </Button>
          <Button
            size="sm"
            :disabled="!newBoard.name.trim()"
            @click="submitNewBoard"
          >
            Create board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div class="flex-1" />

    <Separator />

    <!-- help / install menu -->
    <div class="p-2.5">
      <DropdownMenu v-model:open="helpMenuOpen">
        <DropdownMenuTrigger as-child>
          <button
            class="flex h-9 items-center gap-2.5 rounded-md text-left text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            :class="expanded ? 'w-full px-2.5' : 'size-9 justify-center'"
            :title="!expanded ? 'Help & install' : undefined"
          >
            <Icon name="circle-help" :size="18" class="shrink-0" />
            <span v-show="expanded" class="whitespace-nowrap text-sm">
              Help &amp; install
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" class="w-56">
          <DropdownMenuItem>
            <Icon name="message-square-warning" :size="14" /> Send a bug report
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Icon name="life-buoy" :size="14" /> Contact support
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Icon name="book-open" :size="14" /> Docs
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Icon name="download" :size="14" /> Install browser extension
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </aside>
</template>
