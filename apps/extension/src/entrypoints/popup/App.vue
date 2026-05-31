<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Brand, Icon } from "@pinlay/design";
import { clearAuth, getAuth, onAuthChange, setAuth, type StoredAuth } from "../../lib/auth";
import { api, type Me, type Workspace } from "../../lib/api";
import {
  clearSessionCache,
  getSessionCache,
  setSessionCache,
} from "../../lib/session-cache";
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
// We render real identity whenever we HAVE it — including while offline with a
// cached identity. The "Offline" pill in the header signals the staleness;
// blanking the popup just because the network blipped is a worse UX.
const hasIdentity = computed(() => !!me.value && !!workspace.value);
const showIdlePrompt = computed(
  () => !isLoading.value && !hasIdentity.value,
);

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

// ── Workspace switcher ───────────────────────────────────────────────────
// Lazy-loaded the first time the dropdown opens — saves an API call when the
// user never opens it (the common case for solo workspaces).
const switcherOpen = ref(false);
const switcherRootEl = ref<HTMLElement | null>(null);
const workspaces = ref<Workspace[] | null>(null);
const workspacesLoading = ref(false);
const switchingTo = ref<string | null>(null);

// Outside-click + Escape close the dropdown. Pointerdown (not click) so the
// menu closes immediately on the mousedown that began outside, without
// swallowing the inside-click that picks a workspace.
function onDocPointerDown(e: PointerEvent) {
  if (!switcherOpen.value) return;
  const root = switcherRootEl.value;
  if (root && !root.contains(e.target as Node)) {
    switcherOpen.value = false;
  }
}
function onDocKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && switcherOpen.value) {
    switcherOpen.value = false;
  }
}

async function loadWorkspaces() {
  if (workspaces.value || workspacesLoading.value) return;
  workspacesLoading.value = true;
  try {
    workspaces.value = await api.listWorkspaces();
  } catch {
    workspaces.value = [];
  } finally {
    workspacesLoading.value = false;
  }
}

function toggleSwitcher() {
  switcherOpen.value = !switcherOpen.value;
  if (switcherOpen.value) void loadWorkspaces();
}

async function chooseWorkspace(ws: Workspace) {
  // No-op when picking the current one — close the dropdown only.
  if (ws.id === workspace.value?.id) {
    switcherOpen.value = false;
    return;
  }
  switchingTo.value = ws.id;
  try {
    const res = await api.switchWorkspace(ws.id);
    // Replace stored token + clear cache so the next refresh hydrates fresh.
    if (auth.value) {
      await setAuth({
        token: res.token,
        orgId: res.workspace.id,
        userId: auth.value.userId,
      });
    }
    await clearSessionCache();
    workspaces.value = null; // force a fresh list next time it opens
    switcherOpen.value = false;
    await refresh();
  } catch {
    /* keep dropdown open so user can retry */
  } finally {
    switchingTo.value = null;
  }
}

let unsubscribeAuth: (() => void) | null = null;
onUnmounted(() => {
  unsubscribeAuth?.();
  document.removeEventListener("pointerdown", onDocPointerDown);
  document.removeEventListener("keydown", onDocKeydown);
});

onMounted(async () => {
  document.addEventListener("pointerdown", onDocPointerDown);
  document.addEventListener("keydown", onDocKeydown);

  try {
    const data = await chrome.storage.local.get(FAB_HIDDEN_KEY);
    launcherHidden.value = !!data[FAB_HIDDEN_KEY];
  } catch {
    /* ignore */
  }
  auth.value = await getAuth();

  // Hydrate from cached identity BEFORE the network call — the popup opens
  // showing the user's real name/workspace instantly, no skeleton flash on
  // every cold mount. The background refresh below keeps it honest.
  const cached = await getSessionCache();
  if (cached) {
    me.value = cached.me;
    workspace.value = cached.workspace;
    conn.value = "connected";
  }

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
 *  from a transport failure (offline) so the idle UI can be specific.
 *  Writes the result to chrome.storage so the next popup open hydrates
 *  instantly (stale-while-revalidate). */
async function refresh() {
  // Only show the skeleton when we have NOTHING — neither in-memory nor cached.
  // Otherwise the cached data stays on screen while we revalidate silently.
  if (!me.value) conn.value = "loading";
  try {
    const [meRes, wsRes] = await Promise.all([
      api.me(),
      api.currentWorkspace(),
    ]);
    me.value = meRes;
    workspace.value = wsRes;
    conn.value = "connected";
    void setSessionCache({ me: meRes, workspace: wsRes });
  } catch (e) {
    const status = (e as { status?: number }).status;
    // 401 = the cached identity is no longer valid → drop it. A transport
    // failure (offline) is transient — KEEP the cache so a brief network
    // hiccup doesn't blank the popup; just flip the connection pill.
    if (status === 401) {
      me.value = null;
      workspace.value = null;
      conn.value = "disconnected";
      void clearSessionCache();
    } else {
      conn.value = "offline";
    }
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
  await clearSessionCache();
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
      <!-- Connection pill: 4 honest states. NEVER says "Local" while we're
           still resolving — show a skeleton dot + label instead so the user
           isn't told something wrong for the half-second before /auth/me
           returns. -->
      <span
        class="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium"
        :class="{
          'text-muted-foreground': isLoading,
          'text-status-resolved': isConnected,
          'text-primary': conn === 'disconnected',
          'text-status-stale': conn === 'offline',
        }"
      >
        <span
          v-if="isLoading"
          class="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40"
        />
        <span
          v-else
          class="h-1.5 w-1.5 rounded-full"
          :class="{
            'bg-status-resolved': isConnected,
            'bg-primary': conn === 'disconnected',
            'bg-status-stale': conn === 'offline',
          }"
        />
        {{
          isLoading
            ? "Checking"
            : isConnected
              ? "Live"
              : conn === "offline"
                ? "Offline"
                : "Not connected"
        }}
      </span>
    </header>

    <div class="flex flex-col gap-3 p-3">
      <!-- ── Primary action ──────────────────────────────────────────────── -->
      <!-- Rendered while we have ANY identity (loading skeleton, connected, or
           cached-but-offline). The disabled state + subtitle communicate when
           it can't actually be used; hiding it would shift layout on every
           network blip. Hidden only on a true cold disconnected state. -->
      <button
        v-if="isLoading || hasIdentity"
        type="button"
        :disabled="status === 'starting' || !isConnected"
        class="group flex items-center gap-2.5 rounded-lg bg-primary px-3 py-2.5 text-left text-primary-foreground shadow-[0_2px_8px_color-mix(in_oklab,var(--primary)_25%,transparent)] transition-[transform,box-shadow,background-color] hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
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
            {{
              isLoading
                ? "Checking your session…"
                : isConnected
                  ? "Click any element to start"
                  : conn === "offline"
                    ? "Reconnect to start pinning"
                    : "Connect a workspace to start"
            }}
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

        <!-- LOADING: skeleton with the same shape as the real rows so the
             layout doesn't jump when data arrives. Never shows placeholder
             text like "Local" — silence is honest. -->
        <div
          v-if="isLoading"
          class="overflow-hidden rounded-lg border border-border bg-card"
          aria-busy="true"
        >
          <div
            v-for="i in 2"
            :key="i"
            class="flex items-center gap-3 px-3 py-2.5"
            :class="i === 2 ? 'border-t border-border' : ''"
          >
            <span class="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <span class="flex min-w-0 flex-1 flex-col gap-1.5">
              <span class="h-2.5 w-24 animate-pulse rounded bg-muted" />
              <span class="h-2 w-32 animate-pulse rounded bg-muted/70" />
            </span>
          </div>
        </div>

        <!-- IDLE: only when we have NO identity at all (disconnected from a
             cold start). If we're offline but cached, we render the connected
             block below — the header pill shows staleness. -->
        <div
          v-else-if="showIdlePrompt"
          class="overflow-hidden rounded-lg border border-border bg-card"
        >
          <div class="flex flex-col items-center gap-2.5 px-4 py-4 text-center">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Icon
                :name="conn === 'offline' ? 'cloud-off' : 'link'"
                :size="18"
                :stroke-width="2"
              />
            </span>
            <span class="flex flex-col gap-0.5">
              <span class="text-[13px] font-semibold leading-tight text-foreground">
                {{
                  conn === "offline"
                    ? "Can't reach pinlay"
                    : "Connect your workspace"
                }}
              </span>
              <span class="text-[11px] leading-snug text-muted-foreground">
                {{
                  conn === "offline"
                    ? "The API isn't responding. Check your connection and retry."
                    : "Sign in to save pins, sync with your team, and route to your tracker."
                }}
              </span>
            </span>
            <button
              type="button"
              class="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-[0_1px_2px_color-mix(in_oklab,var(--primary)_25%,transparent)] transition-colors hover:bg-primary-hover"
              @click="conn === 'offline' ? refresh() : onConnect()"
            >
              <Icon
                :name="conn === 'offline' ? 'refresh-cw' : 'log-in'"
                :size="13"
                :stroke-width="2.25"
              />
              {{ conn === "offline" ? "Try again" : "Connect workspace" }}
            </button>
          </div>
        </div>

        <!-- CONNECTED: real identity + workspace. -->
        <div
          v-else
          class="overflow-hidden rounded-lg border border-border bg-card"
        >
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
                {{ userEmail }}
              </span>
            </span>
          </div>

          <div class="border-t border-border" />

          <!-- Workspace row + floating switcher. Wrapper is `relative` so the
               dropdown can anchor to it; the dropdown is absolute-positioned
               with z-10 to float over later siblings (Preferences). -->
          <div ref="switcherRootEl" class="relative">
            <button
              type="button"
              :disabled="!isConnected"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
              :aria-expanded="switcherOpen"
              aria-haspopup="listbox"
              @click="toggleSwitcher"
            >
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
              <Icon
                v-if="isConnected"
                name="chevrons-up-down"
                :size="14"
                class="shrink-0 text-muted-foreground/70 transition-transform"
                :class="switcherOpen ? 'rotate-180' : ''"
              />
            </button>

            <!-- Floating dropdown panel — absolute, anchored to the row,
                 floats over everything below it. max-h + overflow-y-auto so
                 it scrolls when the user has many workspaces. -->
            <div
              v-if="switcherOpen"
              role="listbox"
              class="absolute left-2 right-2 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg ring-1 ring-black/5"
            >
              <!-- Loading state -->
              <div
                v-if="workspacesLoading && !workspaces"
                class="flex items-center gap-2 px-2 py-2 text-[11px] text-muted-foreground"
              >
                <Icon
                  name="loader-circle"
                  :size="12"
                  class="animate-spin"
                />
                Loading workspaces…
              </div>

              <!-- Workspace list -->
              <button
                v-for="ws in workspaces ?? []"
                :key="ws.id"
                type="button"
                role="option"
                :aria-selected="ws.id === workspace?.id"
                :disabled="switchingTo !== null"
                class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors enabled:hover:bg-muted disabled:opacity-60"
                @click="chooseWorkspace(ws)"
              >
                <span
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold uppercase"
                  :class="
                    ws.id === workspace?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ ws.name.charAt(0) }}
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-0">
                  <span
                    class="truncate text-[12px] font-medium leading-tight text-foreground"
                  >
                    {{ ws.name }}
                  </span>
                  <span
                    class="truncate text-[10px] leading-tight text-muted-foreground"
                  >
                    {{
                      ws.plan.charAt(0).toUpperCase() + ws.plan.slice(1)
                    }}
                    · {{ ws.memberCount }} member{{
                      ws.memberCount === 1 ? "" : "s"
                    }}
                  </span>
                </span>
                <Icon
                  v-if="switchingTo === ws.id"
                  name="loader-circle"
                  :size="13"
                  class="shrink-0 animate-spin text-muted-foreground"
                />
                <Icon
                  v-else-if="ws.id === workspace?.id"
                  name="check"
                  :size="13"
                  class="shrink-0 text-primary"
                />
              </button>

              <!-- Empty state (after load, none returned — shouldn't happen
                   but guards a malformed response). -->
              <div
                v-if="workspaces && workspaces.length === 0"
                class="px-2 py-2 text-[11px] text-muted-foreground"
              >
                No workspaces yet.
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Preferences ─────────────────────────────────────────────────── -->
      <!-- A user preference makes no sense before the user is signed in.
           Visible whenever we have identity (incl. cached-offline) so a brief
           blip doesn't make settings vanish. Hidden during loading + on the
           cold idle prompt. -->
      <section v-if="hasIdentity" class="flex flex-col">
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
            <!-- Track 40 × 20, knob 16 with a 2px left inset. ON: translateX
                 18px → knob's left at 20, right edge at 36 → 4px clear of the
                 track edge. Previous 2px clearance was equal to the knob's own
                 drop-shadow, so the shadow clipped the rounded corner and
                 looked like overflow. -->
            <span
              :class="[
                'relative h-5 w-10 shrink-0 rounded-full transition-colors',
                launcherHidden ? 'bg-muted' : 'bg-primary',
              ]"
            >
              <span
                class="absolute top-0.5 left-0.5 block h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform"
                :style="{
                  transform: launcherHidden
                    ? 'translateX(0)'
                    : 'translateX(18px)',
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
        <!-- During loading, render a quiet placeholder rather than the wrong
             button — bouncing between Connect/Disconnect feels broken. While
             cached-but-offline we still show Disconnect (the user has an
             identity to clear, even if the network is down). -->
        <span v-if="isLoading" class="h-5 w-16" />
        <button
          v-else-if="hasIdentity"
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
