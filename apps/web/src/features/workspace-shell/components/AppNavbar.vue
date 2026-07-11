<script setup lang="ts">
/**
 * The app's single chrome element (2026-07-10 shell redesign): a frosted,
 * sticky top bar. Replaces both the icon sidebar and the StatusBar — with
 * two destinations there's nothing left for a rail to do.
 *
 * Left: brand → home, compact workspace switcher.
 * Right: theme toggle, avatar menu (profile/settings · install extension ·
 * log out). Settings needs no dedicated nav slot — the avatar IS the person,
 * and iOS users expect their account affordance to hold preferences.
 */
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Brand,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@pinlay/design";
import { useAuth } from "@/shared/composables/useAuth";
import { useTheme } from "@/shared/composables/useTheme";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import WorkspaceSwitcher from "./WorkspaceSwitcher.vue";

const router = useRouter();
const { user, logout } = useAuth();
const { mode, cycle } = useTheme();

const themeIcon = { light: "sun", dark: "moon", system: "monitor" } as const;

const accountMenuOpen = ref(false);
const displayName = computed(
  () => user.value?.name || user.value?.email || "Account",
);

function go(path: string) {
  accountMenuOpen.value = false;
  void router.push(path);
}

async function onLogout() {
  logout();
  await router.push({ name: "login" });
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl"
    style="padding-top: env(safe-area-inset-top)"
  >
    <div class="mx-auto flex h-[52px] w-full max-w-3xl items-center gap-2 px-4 sm:px-6">
      <RouterLink
        to="/"
        class="flex min-h-[44px] items-center gap-2 rounded-lg pr-1 transition-opacity active:opacity-60"
        aria-label="Pins — home"
      >
        <Brand :size="22" class="text-primary" />
        <span class="text-[15px] font-semibold tracking-tight">pinlay</span>
      </RouterLink>

      <div class="max-w-[190px]">
        <WorkspaceSwitcher compact />
      </div>

      <div class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          :title="`Theme: ${mode}`"
          :aria-label="`Theme: ${mode} — click to change`"
          @click="cycle"
        >
          <Icon :name="themeIcon[mode]" :size="17" />
        </button>

        <DropdownMenu v-model:open="accountMenuOpen">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex size-10 items-center justify-center rounded-full transition-transform active:scale-95"
              :title="displayName"
              :aria-label="`Account: ${displayName}`"
            >
              <UserAvatar
                :name="displayName"
                :avatar-url="user?.avatarUrl ?? null"
                :size="30"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-60">
            <DropdownMenuItem class="gap-2.5 p-2" @select="go('/settings/profile')">
              <UserAvatar
                :name="displayName"
                :avatar-url="user?.avatarUrl ?? null"
                :size="30"
              />
              <span class="flex min-w-0 flex-1 flex-col leading-tight">
                <span class="truncate text-sm font-medium text-foreground">{{
                  displayName
                }}</span>
                <span
                  v-if="user?.email"
                  class="truncate text-[11px] text-muted-foreground"
                  >{{ user.email }}</span
                >
              </span>
              <Icon name="chevron-right" :size="14" class="shrink-0 text-muted-foreground" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="go('/settings')">
              <Icon name="settings" :size="15" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem @select="go('/connect-extension')">
              <Icon name="puzzle" :size="15" /> Install extension
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              class="text-destructive focus:text-destructive"
              @select="onLogout"
            >
              <Icon name="log-out" :size="15" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
