<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Brand, Icon } from "@pinlay/design";
import { clearAuth, getAuth, onAuthChange, type StoredAuth } from "../../lib/auth";
import { api, type Me, type Workspace } from "../../lib/api";
import { WEB_APP_URL } from "../../lib/env";

// "Main popover launcher" — the menu the user opens from the Chrome toolbar
// icon. Owns the account chrome (user, workspace, connect/disconnect), the
// primary action ("Drop a pin"), and the FAB show/hide toggle. The in-page
// FAB stays focused on the active task and does NOT carry account chrome.

// Connection lifecycle drives the whole UI:
//   "loading"      → first /auth/me in flight; show skeletons (never dummy data)
//   "connected"    → real identity + workspace resolved
//   "disconnected" → no/invalid token (401) → idle connect prompt
//   "offline"      → API unreachable (network) → idle, retry-able
type ConnState = "loading" | "connected" | "disconnected" | "offline";
const conn = ref<ConnState>("loading");

const status = ref<"idle" | "starting" | "ok" | "error">("idle");
const auth = ref<StoredAuth | null>(null);
const me = ref<Me | null>(null);
const workspace = ref<Workspace | null>(null);
const pageHost = ref<string>("");

const isLoading = computed(() => conn.value === "loading");
const isConnected = computed(() => conn.value === "connected");

// User identity (only read when connected).
const userInitial = computed(() => {
  const source = me.value?.name?.trim() || me.value?.email?.trim();
  return source ? source.charAt(0).toUpperCase() : "?";
});
const userLabel = computed(() => me.value?.name || me.value?.email || "");
const userEmail = computed(() => me.value?.email ?? "");

// Workspace identity — the REAL name + plan, never the cuid.
const workspaceLabel = computed(() => workspace.value?.name ?? "");
const workspaceSubtext = computed(() => {
  if (!workspace.value) return "";
  const plan = workspace.value.plan;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const seats = workspace.value.memberCount;
  return `${planLabel} · ${seats} member${seats === 1 ? "" : "s"}`;
});

const FAB_HIDDEN_KEY = "pl_fab_hidden";
const launcherHidden = ref(false);

let unsubscribeAuth: (() => void) | null = null;
onUnmounted(() => unsubscribeAuth?.());

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
    void refresh();
  });
  void refresh();

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

/** Resolve identity + workspace in one pass. Distinguishes 401 (not connected)
 *  from a transport failure (offline) so the idle UI can be specific. */
async function refresh() {
  // Only show the skeleton on the very first load, not on background refreshes.
  if (!me.value) conn.value = "loading";
  try {
    const [meRes, wsRes] = await Promise.all([
      api.me(),
      api.currentWorkspace(),
    ]);
    me.value = meRes;
    workspace.value = wsRes;
    conn.value = "connected";
  } catch (e) {
    me.value = null;
    workspace.value = null;
    const status = (e as { status?: number }).status;
    conn.value = status === 401 ? "disconnected" : "offline";
  }
}

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
  chrome.tabs.create({ url: `${WEB_APP_URL}/` });
}

async function onDisconnect() {
  await clearAuth();
  me.value = null;
  workspace.value = null;
  conn.value = "disconnected";
}

function onConnect() {
  // Open the dashboard's connect page. If the user is already signed in there,
  // it hands the session token straight back to this extension; otherwise it
  // routes through /login?redirect=/connect-extension and returns here after.
  chrome.tabs.create({ url: `${WEB_APP_URL}/connect-extension` });
  window.close();
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
