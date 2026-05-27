<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Icon,
  Separator,
} from "@pinlayer/design";
import { useShell } from "@/shared/composables/useShell";
import WorkspaceSwitcher from "./WorkspaceSwitcher.vue";

const route = useRoute();
const { mobileOpen, closeMobile } = useShell();

/**
 * Hover-expand on desktop. Stays expanded while a menu is open (so clicking the
 * workspace / help menu — which portal outside the sidebar — doesn't collapse
 * it). On mobile the drawer (mobileOpen) is the expanded state.
 */
const hovered = ref(false);
const wsMenuOpen = ref(false);
const helpMenuOpen = ref(false);
const expanded = computed(
  () =>
    hovered.value || mobileOpen.value || wsMenuOpen.value || helpMenuOpen.value
);

const nav = [
  { name: "Pinboards", to: "/", icon: "panels-top-left" },
  // { name: "Dashboard", to: "/overview", icon: "bar-chart-3" },
  { name: "Integrations", to: "/integrations", icon: "plug" },
  { name: "Settings", to: "/settings", icon: "settings" },
];

const boards = [
  { name: "Checkout", color: "#3fcf8e", count: 8 },
  { name: "Marketing site", color: "#0d9488", count: 3 },
  { name: "Mobile web", color: "#f97316", count: 12 },
];

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
        <Icon name="map-pin" :size="24" class="fill-primary text-white" />
      </span>
      <span
        v-show="expanded"
        class="whitespace-nowrap text-[15px] font-semibold tracking-tight"
        >pinLayer</span
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
        >
          <Icon name="plus" :size="14" />
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <a
          v-for="b in boards"
          :key="b.name"
          class="flex h-8 cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <span
            class="size-2 shrink-0 rounded-full"
            :style="{ background: b.color }"
          />
          <span class="flex-1 truncate whitespace-nowrap">{{ b.name }}</span>
          <span class="font-mono text-[11px] text-muted-foreground/70">{{
            b.count
          }}</span>
        </a>
      </div>
    </div>

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
          <DropdownMenuItem>
            <Icon name="shield-check" :size="14" /> Security
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Icon name="activity" :size="14" /> System status
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Icon name="dollar-sign" :size="14" /> Pricing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Icon name="newspaper" :size="14" /> Blog
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Icon name="download" :size="14" /> Install
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent class="w-56">
              <DropdownMenuItem>
                <Icon name="globe" :size="14" /> Browser extension
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Icon name="message-square" :size="14" /> Slack app
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Icon name="laptop" :size="14" /> macOS app
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </aside>
</template>
