<script setup lang="ts">
/**
 * Sidebar — deliberately tiny. Two destinations (Pins, Settings) plus the
 * workspace switcher and account menu. Boards/Integrations UI was removed in
 * the 2026-07-10 pin-inbox rebuild (see ROADMAP.md "Product principles":
 * the dashboard is an inbox, not a workspace).
 */
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Brand,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Separator,
} from "@pinlay/design";
import { useShell } from "@/shared/composables/useShell";
import { useAuth } from "@/shared/composables/useAuth";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import WorkspaceSwitcher from "./WorkspaceSwitcher.vue";

const route = useRoute();
const router = useRouter();
const { mobileOpen, closeMobile } = useShell();
const { user, logout } = useAuth();

const accountMenuOpen = ref(false);
const displayName = computed(
  () => user.value?.name || user.value?.email || "Account",
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
 * Hover-expand on desktop. Stays expanded while a menu is open (so clicking
 * the workspace / account menu — which portal outside the sidebar — doesn't
 * collapse it). On mobile the drawer (mobileOpen) is the expanded state.
 */
const hovered = ref(false);
const wsMenuOpen = ref(false);
const expanded = computed(
  () => hovered.value || mobileOpen.value || wsMenuOpen.value || accountMenuOpen.value,
);

const nav = [
  { name: "Pins", to: "/", icon: "map-pin" },
  { name: "Settings", to: "/settings", icon: "settings" },
];

function isActive(to: string) {
  // Pins (/) stays highlighted on pin detail — it's a child view.
  if (to === "/")
    return (
      route.path === "/" ||
      route.path.startsWith("/p/") ||
      route.path.startsWith("/s/")
    );
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
    style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom)"
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

    <!-- nav — 44px rows for touch -->
    <nav class="mt-4 flex flex-col gap-1 px-2.5">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="relative flex h-11 items-center gap-3 rounded-md text-sm transition-colors"
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

    <div class="flex-1" />

    <Separator />

    <!-- footer: account menu. Trigger shows the user; the user-info row
         INSIDE the popover is the link to Profile. Log out lives below. -->
    <div class="p-2.5">
      <DropdownMenu v-model:open="accountMenuOpen">
        <DropdownMenuTrigger as-child>
          <button
            class="flex h-11 items-center gap-2.5 rounded-md text-left text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            :class="
              expanded ? 'w-full px-2' : 'size-10 justify-center self-center'
            "
            :title="!expanded ? displayName : undefined"
          >
            <UserAvatar
              :name="displayName"
              :avatar-url="user?.avatarUrl ?? null"
              :size="24"
              class="shrink-0"
            />
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
