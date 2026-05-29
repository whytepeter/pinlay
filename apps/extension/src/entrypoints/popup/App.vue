<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Brand, Icon } from "@pinlay/design";
import { clearAuth, getAuth, onAuthChange, type StoredAuth } from "../../lib/auth";

// "Main popover launcher" — the menu the user opens from the Chrome toolbar
// icon. Owns the account chrome (user, workspace, connect/disconnect), the
// primary action ("Drop a pin"), and the FAB show/hide toggle. The in-page
// FAB stays focused on the active task and does NOT carry account chrome.

const status = ref<"idle" | "starting" | "ok" | "error">("idle");
const auth = ref<StoredAuth | null>(null);
const pageHost = ref<string>("");

// StoredAuth currently only carries token + orgId + userId; once apps/api lands
// we'll extend it with `user: { name, email }` and `workspace: { name, plan }`
// and these computeds will pull from there directly.
const userInitial = computed(() => {
  const id = auth.value?.userId?.trim();
  if (id) return id.charAt(0).toUpperCase();
  return "Y";
});
const userLabel = computed(() => auth.value?.userId || "You");
const userSubtext = computed(() =>
  auth.value ? "Connected" : "Working in local mode",
);
const workspaceLabel = computed(
  () => auth.value?.orgId || "Local workspace",
);
const workspaceSubtext = computed(() =>
  auth.value ? "Synced" : "Not connected",
);
const connected = computed(() => !!auth.value);

const FAB_HIDDEN_KEY = "pl_fab_hidden";
const launcherHidden = ref(false);

let unsubscribeAuth: (() => void) | null = null;

onMounted(async () => {
  try {
    const data = await chrome.storage.local.get(FAB_HIDDEN_KEY);
    launcherHidden.value = !!data[FAB_HIDDEN_KEY];
  } catch {
    /* ignore */
  }
  auth.value = await getAuth();
  unsubscribeAuth = onAuthChange((next) => {
    auth.value = next;
  });

  // Show the active tab's host so the user has page context (knows what
  // they're about to pin on). chrome:// and the new-tab page render blank.
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) {
      try {
        pageHost.value = new URL(tab.url).host;
      } catch {
        /* malformed URL — leave host empty */
      }
    }
  } catch {
    /* ignore */
  }
});

async function toggleLauncher() {
  launcherHidden.value = !launcherHidden.value;
  try {
    await chrome.storage.local.set({
      [FAB_HIDDEN_KEY]: launcherHidden.value,
    });
  } catch {
    /* ignore */
  }
}

async function startAnnotation() {
  status.value = "starting";
  try {
    await chrome.runtime.sendMessage({ type: "START_ANNOTATION" });
    status.value = "ok";
    window.close();
  } catch (err) {
    console.error(err);
    status.value = "error";
  }
}

function openDashboard() {
  chrome.tabs.create({ url: "http://localhost:5173/" });
}

async function onDisconnect() {
  if (!auth.value) return;
  await clearAuth();
}

function onConnect() {
  // Auth gate disabled until apps/api lands. The connect CTA opens the
  // dashboard where the user will eventually complete OAuth.
  openDashboard();
}
</script>

<template>
  <div class="w-[320px] font-sans">
    <!-- ── Header — brand + page context + connection pill ───────────────── -->
    <header
      class="flex items-center gap-2.5 border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent px-4 py-3"
    >
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
      >
        <Brand :size="20" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <span class="text-[14px] font-semibold leading-tight text-foreground">
            pinlay
          </span>
          <span
            class="rounded-full bg-muted px-1.5 py-px text-[9px] font-medium leading-none text-muted-foreground"
          >
            v0.0.1
          </span>
        </div>
        <div
          class="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground"
        >
          {{ pageHost || "This page" }}
        </div>
      </div>
      <span
        class="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium"
        :class="connected ? 'text-status-resolved' : 'text-muted-foreground'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="connected ? 'bg-status-resolved' : 'bg-muted-foreground/50'"
        />
        {{ connected ? "Live" : "Local" }}
      </span>
    </header>

    <div class="flex flex-col gap-3 p-3">
      <!-- ── Primary action ──────────────────────────────────────────────── -->
      <button
        type="button"
        :disabled="status === 'starting'"
        class="group flex items-center gap-2.5 rounded-lg bg-primary px-3 py-2.5 text-left text-primary-foreground shadow-[0_2px_8px_color-mix(in_oklab,var(--primary)_25%,transparent)] transition-[transform,box-shadow,background-color] hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60"
        @click="startAnnotation"
      >
        <span
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/15"
        >
          <Icon name="map-pin" :size="14" :stroke-width="2.25" />
        </span>
        <span class="flex-1">
          <span class="block text-[13px] font-semibold leading-tight">
            Drop a pin on this page
          </span>
          <span class="block text-[11px] leading-tight text-white/75">
            Click any element to start
          </span>
        </span>
        <Icon
          name="arrow-right"
          :size="14"
          class="opacity-70 transition-transform group-hover:translate-x-0.5"
        />
      </button>

      <!-- ── Account ─────────────────────────────────────────────────────── -->
      <section class="flex flex-col">
        <p
          class="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
        >
          Account
        </p>
        <div class="overflow-hidden rounded-lg border border-border bg-card">
          <!-- User row -->
          <div class="flex items-center gap-3 px-3 py-2.5">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              :style="{ background: 'oklch(0.55 0.16 264)' }"
            >
              {{ userInitial }}
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-0">
              <span
                class="truncate text-[12.5px] font-medium leading-tight text-foreground"
              >
                {{ userLabel }}
              </span>
              <span
                class="truncate text-[10.5px] leading-tight text-muted-foreground"
              >
                {{ userSubtext }}
              </span>
            </span>
          </div>

          <div class="border-t border-border" />

          <!-- Workspace row -->
          <div class="flex items-center gap-3 px-3 py-2.5">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"
            >
              <Icon name="building-2" :size="14" :stroke-width="2" />
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-0">
              <span
                class="truncate text-[12.5px] font-medium leading-tight text-foreground"
              >
                {{ workspaceLabel }}
              </span>
              <span
                class="truncate text-[10.5px] leading-tight text-muted-foreground"
              >
                {{ workspaceSubtext }}
              </span>
            </span>
          </div>
        </div>
      </section>

      <!-- ── Preferences ─────────────────────────────────────────────────── -->
      <section class="flex flex-col">
        <p
          class="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
        >
          Preferences
        </p>
        <div class="overflow-hidden rounded-lg border border-border bg-card">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
            @click="toggleLauncher"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
            >
              <Icon
                :name="launcherHidden ? 'eye-off' : 'eye'"
                :size="14"
                :stroke-width="1.9"
              />
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-0">
              <span
                class="truncate text-[12.5px] font-medium leading-tight text-foreground"
              >
                Floating launcher
              </span>
              <span
                class="truncate text-[10.5px] leading-tight text-muted-foreground"
              >
                {{
                  launcherHidden
                    ? "Hidden on this page"
                    : "Visible on every page"
                }}
              </span>
            </span>
            <span
              :class="[
                'relative h-[18px] w-8 shrink-0 rounded-full transition-colors',
                launcherHidden ? 'bg-muted' : 'bg-primary',
              ]"
            >
              <span
                class="absolute top-0.5 left-0.5 block h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform"
                :style="{
                  transform: launcherHidden
                    ? 'translateX(0)'
                    : 'translateX(14px)',
                }"
              />
            </span>
          </button>
        </div>
      </section>

      <!-- ── Footer ──────────────────────────────────────────────────────── -->
      <div
        class="-mx-3 -mb-3 mt-1 flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2"
      >
        <button
          v-if="auth"
          type="button"
          class="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-destructive transition-colors hover:bg-destructive/10"
          @click="onDisconnect"
        >
          <Icon name="log-out" :size="12" :stroke-width="2" />
          Disconnect
        </button>
        <button
          v-else
          type="button"
          class="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:bg-muted"
          @click="onConnect"
        >
          <Icon name="log-in" :size="12" :stroke-width="2" />
          Connect
        </button>

        <button
          class="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          @click="openDashboard"
        >
          Dashboard
          <Icon name="arrow-up-right" :size="11" :stroke-width="2" />
        </button>
      </div>
    </div>
  </div>
</template>
