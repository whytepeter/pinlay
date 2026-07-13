<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Brand, Button, Icon, Switch, UserAvatar } from "@pinlay/design";
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

// Roadmap 2.1 — pin-related state synced from the active tab's content script.
// `pageCounts` drives the View pins card breakdown ("3 open · 1 resolved").
// `popupPinList` is the data backing the Pins sub-view.
const activeTabId = ref<number | null>(null);
const pagePinCount = ref(0);
const pageViewing = ref(false);
const pageCounts = ref<{ open: number; resolved: number; all: number }>({
  open: 0,
  resolved: 0,
  all: 0,
});

interface PopupPinRow {
  id: string;
  index: number;
  title: string;
  description: string;
  status: string;
  severity: string;
  pageUrl: string;
  createdAt: string;
  resolved: boolean;
}
const popupPinList = ref<PopupPinRow[]>([]);

// Async lifecycle for the pin probe.
//   `pinsLoading` drives the skeleton — but only when we have NO data to
//   show. If we have cached pins (or already-loaded ones), refetch silently
//   in the background so the UI never flashes back to a skeleton.
//   `pinsError` powers the Try again card on a hard failure.
const pinsLoading = ref(true);
const pinsError = ref<string | null>(null);

// Cache pin state in chrome.storage.local so opening the popup on a URL the
// user has visited before shows the View pins card immediately — no skeleton
// flash, then the fresh fetch quietly reconciles.
const PIN_CACHE_PREFIX = "pl_pin_cache_v1:";
const PIN_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30m hard cap

interface PinCacheEntry {
  counts: { open: number; resolved: number; all: number };
  pins: PopupPinRow[];
  viewablePinCount: number;
  viewing: boolean;
  ts: number;
}

async function readPinCache(url: string): Promise<PinCacheEntry | null> {
  try {
    const key = PIN_CACHE_PREFIX + url;
    const r = await chrome.storage.local.get(key);
    const entry = r[key] as PinCacheEntry | undefined;
    if (!entry) return null;
    if (Date.now() - entry.ts > PIN_CACHE_MAX_AGE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}
async function writePinCache(url: string, entry: Omit<PinCacheEntry, "ts">) {
  try {
    await chrome.storage.local.set({
      [PIN_CACHE_PREFIX + url]: { ...entry, ts: Date.now() },
    });
  } catch {
    /* ignore */
  }
}

// Track the active tab's URL so fetchPinState can also persist to cache.
const activeTabUrl = ref<string | null>(null);

// Popup view state — main screen vs Pins sub-view.
const view = ref<"main" | "pins">("main");
const pinFilter = ref<"open" | "resolved" | "all">("open");
const filteredPinList = computed(() => {
  if (pinFilter.value === "all") return popupPinList.value;
  if (pinFilter.value === "resolved") {
    return popupPinList.value.filter((p) => p.resolved);
  }
  return popupPinList.value.filter((p) => !p.resolved);
});
const filteredPinLabel = computed(() => {
  const n = filteredPinList.value.length;
  return `${n} ${pinFilter.value} pin${n === 1 ? "" : "s"}`;
});

// Infinite scroll for the Pins sub-view. Render the first PAGE_SIZE rows;
// an IntersectionObserver on the sentinel below the list bumps the count
// when the user scrolls to the bottom. Resets to PAGE_SIZE on filter change
// or whenever the sub-view re-opens so we don't leak prior pagination.
const POPUP_PIN_PAGE_SIZE = 15;
const popupVisibleCount = ref(POPUP_PIN_PAGE_SIZE);
const visiblePopupPinList = computed(() =>
  filteredPinList.value.slice(0, popupVisibleCount.value),
);
const hasMorePinsToShow = computed(
  () => popupVisibleCount.value < filteredPinList.value.length,
);
const popupSentinelEl = ref<HTMLDivElement | null>(null);
let popupSentinelObserver: IntersectionObserver | null = null;
function attachPopupSentinel() {
  popupSentinelObserver?.disconnect();
  popupSentinelObserver = null;
  if (view.value !== "pins" || !popupSentinelEl.value) return;
  popupSentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        popupVisibleCount.value = Math.min(
          popupVisibleCount.value + POPUP_PIN_PAGE_SIZE,
          filteredPinList.value.length,
        );
      }
    },
    { threshold: 0.1 },
  );
  popupSentinelObserver.observe(popupSentinelEl.value);
}
watch([popupSentinelEl, view], () => {
  void nextTick(() => attachPopupSentinel());
});
watch(pinFilter, () => {
  popupVisibleCount.value = POPUP_PIN_PAGE_SIZE;
});

// Compact relative time — "just now" / "5m" / "3h" / "2d". For longer spans
// fall back to the ISO date. Mirrors the dashboard's timeAgo but smaller.
function relativeTime(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

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
const userLabel = computed(() => me.value?.name || me.value?.email || "");

// Workspace name — referenced inline alongside member count in the
// consolidated account row.
const workspaceLabel = computed(() => workspace.value?.name ?? "");

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
  popupSizeObserver?.disconnect();
  if (popupResizeFrame) cancelAnimationFrame(popupResizeFrame);
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
    // Hydrate from cache so the View pins card paints IMMEDIATELY on revisit
    // — no skeleton flash. Loading flag flips off as soon as we have cached
    // data; the actual refetch happens silently in the background and
    // reconciles into state when it returns.
    if (tab?.url) {
      activeTabUrl.value = tab.url;
      const cached = await readPinCache(tab.url);
      if (cached) {
        pageCounts.value = cached.counts;
        popupPinList.value = cached.pins;
        pagePinCount.value = cached.viewablePinCount;
        pageViewing.value = cached.viewing;
        pinsLoading.value = false;
      }
    }
    if (tab?.id != null) {
      activeTabId.value = tab.id;
      await fetchPinState();
    } else {
      // No active tab — nothing to load; clear the loading flag so the UI
      // moves past the skeleton.
      pinsLoading.value = false;
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

// Fetch pin state from the active tab's content script. Drives the View pins
// card's loading skeleton + error/retry surface. Surfaces a friendly error
// message when the content script can't respond (chrome:// pages, network
// failure, orphaned content script after extension reload).
async function fetchPinState() {
  if (activeTabId.value == null) {
    pinsLoading.value = false;
    return;
  }
  // Only show the skeleton when there's NOTHING on screen yet — if we
  // hydrated from cache, the user already sees pins and we shouldn't flash
  // back to a loading state on revalidate.
  const hasDataAlready =
    pageCounts.value.all > 0 || popupPinList.value.length > 0;
  if (!hasDataAlready) pinsLoading.value = true;
  pinsError.value = null;
  try {
    const res = (await chrome.tabs.sendMessage(activeTabId.value, {
      type: "GET_PAGE_PIN_STATE",
    })) as
      | {
          ok?: boolean;
          viewablePinCount?: number;
          viewing?: boolean;
          counts?: { open: number; resolved: number; all: number };
          pins?: PopupPinRow[];
        }
      | undefined;
    if (res?.ok) {
      pagePinCount.value = res.viewablePinCount ?? 0;
      pageViewing.value = !!res.viewing;
      pageCounts.value = res.counts ?? { open: 0, resolved: 0, all: 0 };
      popupPinList.value = res.pins ?? [];
      // Persist for stale-while-revalidate on the next popup open.
      if (activeTabUrl.value) {
        void writePinCache(activeTabUrl.value, {
          counts: pageCounts.value,
          pins: popupPinList.value,
          viewablePinCount: pagePinCount.value,
          viewing: pageViewing.value,
        });
      }
    } else {
      // Surface the retry card only if we have nothing to show. With cached
      // data, prefer silence — the user sees the real-but-stale list.
      if (!hasDataAlready) {
        pinsError.value = "Couldn't load pins from this page.";
      }
    }
  } catch (err) {
    // No content script on this URL (chrome://, web store, etc.) → fail
    // silently. Real network/runtime errors get the retry card.
    const msg = (err as Error)?.message ?? "";
    if (/Receiving end does not exist|No tab with id|cannot access/i.test(msg)) {
      // Not an error worth surfacing — just no pinlay on this page.
      if (!hasDataAlready) {
        pageCounts.value = { open: 0, resolved: 0, all: 0 };
        popupPinList.value = [];
      }
    } else if (!hasDataAlready) {
      pinsError.value = msg || "Couldn't load pins from this page.";
    }
  } finally {
    pinsLoading.value = false;
  }
}

// Roadmap 2.1 — toggle the developer overlay on the active tab (Hide pins
// button). Stays open on success so the user can continue using the popup.
async function toggleViewPins() {
  if (activeTabId.value == null) return;
  const next = !pageViewing.value;
  try {
    await chrome.tabs.sendMessage(activeTabId.value, {
      type: next ? "VIEW_PINS" : "HIDE_PINS",
    });
    pageViewing.value = next;
  } catch (err) {
    console.error(err);
  }
}

// Pins sub-view navigation.
function openPinsView() {
  view.value = "pins";
}
function closePinsView() {
  view.value = "main";
}

// Chrome popup quirk: the window grows to fit body content but doesn't
// always SHRINK when content gets smaller — async data loads, the loading
// skeleton swapping for the real card, leaving the Pins sub-view, etc. all
// leave a tall popup with empty space below the actual content.
//
// Fix: pin the body's explicit height to whatever the popup root reports
// (offsetHeight). A ResizeObserver re-runs whenever Vue mutates the DOM, so
// any state change that affects layout is caught — not just view swaps.
// Debounced via rAF so a single observer batch doesn't cascade into many
// reflows.
const popupRootEl = ref<HTMLDivElement | null>(null);
let popupSizeObserver: ResizeObserver | null = null;
let popupResizeFrame = 0;
function syncPopupHeight() {
  const el = popupRootEl.value;
  if (!el) return;
  if (popupResizeFrame) cancelAnimationFrame(popupResizeFrame);
  popupResizeFrame = requestAnimationFrame(() => {
    const h = el.offsetHeight;
    if (h > 0) document.body.style.height = `${h}px`;
  });
}
watch(popupRootEl, (el) => {
  popupSizeObserver?.disconnect();
  popupSizeObserver = null;
  if (!el) return;
  popupSizeObserver = new ResizeObserver(() => syncPopupHeight());
  popupSizeObserver.observe(el);
  // Run once now so the initial render sizes the popup to actual content
  // (the popup's initial paint can land taller than the eventual content).
  void nextTick(() => syncPopupHeight());
});

// Render the composer's saved markdown (bold/italic/link) as HTML for the
// sub-view rows. Mirrors AnnotationPinDetail's renderer so both surfaces
// show formatted text rather than raw `**…**`/`_…_` characters.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function safeHref(raw: string): string {
  const t = raw.trim();
  return /^(https?:|mailto:)/i.test(t) ? t : "#";
}
function renderMarkdown(text: string): string {
  if (!text) return "";
  let html = escapeHtml(text);
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${escapeHtml(safeHref(url))}" target="_blank" rel="noopener noreferrer" class="text-primary underline-offset-2 hover:underline">${label}</a>`,
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(/\n/g, "<br>");
  return html;
}

// Roadmap 2.1 — same-host display path. Show "/" for the root, "/search"
// for a sub-path; ignore query params and hash so the rows stay tidy.
function displayPath(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}
function isSameTabUrl(url: string): boolean {
  if (!url || !activeTabUrl.value) return false;
  try {
    const a = new URL(url);
    const b = new URL(activeTabUrl.value);
    // Ignore query + hash so /search and /search?q=x both treat as "same page".
    return a.host === b.host && a.pathname === b.pathname;
  } catch {
    return url === activeTabUrl.value;
  }
}

// Click handler for a pin row in the sub-view. If the pin lives on a
// different URL than the current tab, navigate the tab to that URL with
// `#pinlay-pin=<id>` — the content script reads the hash on page-load and
// mounts the overlay + jumps to the pin. Same-URL clicks just mount the
// overlay and jump.
async function onClickPopupPinRow(row: PopupPinRow) {
  if (activeTabId.value == null) return;
  try {
    if (isSameTabUrl(row.pageUrl)) {
      await chrome.tabs.sendMessage(activeTabId.value, { type: "VIEW_PINS" });
      await chrome.tabs.sendMessage(activeTabId.value, {
        type: "JUMP_TO_PIN",
        id: row.id,
      });
    } else if (row.pageUrl) {
      const sep = row.pageUrl.includes("#") ? "&" : "#";
      await chrome.tabs.update(activeTabId.value, {
        url: `${row.pageUrl}${sep}pinlay-pin=${row.id}`,
      });
    }
    window.close();
  } catch (err) {
    console.error("[pinlay] navigate-to-pin failed:", err);
  }
}

// Drop a pin from the Pins sub-view's "+" button — same path as the main
// CTA but doesn't go through the loading guard (sub-view is only visible
// when we have data, so we know we're connected).
async function startAnnotationFromList() {
  try {
    await chrome.runtime.sendMessage({ type: "START_ANNOTATION" });
    window.close();
  } catch (err) {
    console.error(err);
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

function onCreateAccount() {
  chrome.tabs.create({ url: `${WEB_APP_URL}/signup?redirect=/connect-extension` });
  window.close();
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
  <div ref="popupRootEl" class="w-[320px] font-sans">
    <!-- ── Pins sub-view (Roadmap 2.1) ───────────────────────────────────
         Browse pins on this page with status filter + drop-pin shortcut.
         Reachable from the main view's "View pins" card. -->
    <template v-if="view === 'pins'">
      <header
        class="flex items-center gap-1.5 border-b border-border px-3 py-2.5"
      >
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to main"
          @click="closePinsView"
        >
          <Icon name="chevron-left" :size="14" :stroke-width="2" />
        </button>
        <h2 class="flex-1 text-center text-[13px] font-semibold text-foreground">
          Pins on this page
        </h2>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Drop a new pin"
          @click="startAnnotationFromList"
        >
          <Icon name="plus" :size="14" :stroke-width="2" />
        </button>
      </header>

      <!-- Filter tabs (Open / Resolved / All) — dark pill = active. -->
      <div class="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <button
          v-for="opt in [
            { id: 'open' as const, label: 'Open', count: pageCounts.open },
            { id: 'resolved' as const, label: 'Resolved', count: pageCounts.resolved },
            { id: 'all' as const, label: 'All', count: pageCounts.all },
          ]"
          :key="opt.id"
          type="button"
          :class="[
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
            pinFilter === opt.id
              ? 'bg-foreground text-background'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted',
          ]"
          @click="pinFilter = opt.id"
        >
          {{ opt.label }}
          <span
            :class="[
              'inline-flex items-center justify-center text-[10.5px] font-semibold tabular-nums',
              pinFilter === opt.id ? 'opacity-70' : 'opacity-60',
            ]"
          >
            {{ opt.count }}
          </span>
        </button>
      </div>

      <!-- Pin rows — infinite scroll via the sentinel below. -->
      <div class="max-h-[360px] overflow-y-auto">
        <p
          v-if="filteredPinList.length === 0"
          class="px-3 py-10 text-center text-[12px] text-muted-foreground"
        >
          No {{ pinFilter === "all" ? "" : pinFilter + " " }}pins on this page.
        </p>
        <button
          v-for="row in visiblePopupPinList"
          :key="row.id"
          type="button"
          class="flex w-full items-start gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/30"
          @click="onClickPopupPinRow(row)"
        >
          <span
            :class="[
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
              row.resolved
                ? 'bg-status-resolved/15 text-status-resolved'
                : 'bg-primary-soft text-primary',
            ]"
          >
            {{ row.index }}
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="flex items-start gap-2">
              <span
                class="flex-1 text-[13px] font-medium leading-snug text-foreground [&_strong]:font-semibold"
                v-html="renderMarkdown(row.title)"
              />
              <span
                v-if="row.resolved"
                class="inline-flex shrink-0 items-center rounded-md bg-status-resolved/15 px-1.5 py-0.5 text-[10px] font-medium text-status-resolved"
              >
                Resolved
              </span>
            </span>
            <span
              v-if="row.description"
              class="text-[12px] font-normal leading-snug text-muted-foreground line-clamp-2 [&_strong]:font-semibold [&_strong]:text-foreground"
              v-html="renderMarkdown(row.description)"
            />
            <span class="flex items-center gap-2 text-[11px] text-muted-foreground/80">
              <span
                v-if="row.pageUrl && !isSameTabUrl(row.pageUrl)"
                class="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/70"
                :title="row.pageUrl"
              >
                <Icon name="external-link" :size="9" :stroke-width="2" />
                {{ displayPath(row.pageUrl) }}
              </span>
              <span v-if="row.createdAt" class="flex items-center gap-1">
                <Icon name="clock" :size="11" :stroke-width="2" />
                {{ relativeTime(row.createdAt) }}
              </span>
            </span>
          </span>
        </button>
        <!-- IntersectionObserver sentinel — bumps the rendered count when
             scrolled into view. Removed once everything is on screen. -->
        <div
          v-if="hasMorePinsToShow"
          ref="popupSentinelEl"
          class="h-2"
          aria-hidden="true"
        />
      </div>

      <!-- Sub-view footer -->
      <div
        class="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2"
      >
        <span class="text-[11px] text-muted-foreground">{{ filteredPinLabel }}</span>
        <button
          type="button"
          class="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-foreground transition-colors hover:text-primary"
          @click="openDashboard"
        >
          Open dashboard
          <Icon name="arrow-up-right" :size="11" :stroke-width="2" />
        </button>
      </div>
    </template>

    <!-- ── Main view (default) ─────────────────────────────────────────── -->
    <template v-else>
    <!-- ── Header — brand + page context + status dot ─────────────────────
         One quiet line. Connection state collapses into a colored dot (the
         label lives in the tooltip); the old gradient/version-chip/pill trio
         read as three competing signals. -->
    <header class="flex items-center gap-2 border-b border-border/60 px-4 py-3">
      <Brand :size="18" class="shrink-0 text-primary" />
      <span class="truncate text-[13px] font-semibold text-foreground">
        {{ pageHost || "pinlay" }}
      </span>
      <span
        class="ml-auto h-2 w-2 shrink-0 rounded-full"
        :class="{
          'animate-pulse bg-muted-foreground/40': isLoading,
          'bg-status-resolved': isConnected,
          'bg-primary': conn === 'disconnected',
          'bg-status-stale': conn === 'offline',
        }"
        :title="
          isLoading
            ? 'Checking your session…'
            : isConnected
              ? 'Connected'
              : conn === 'offline'
                ? 'Offline — API unreachable'
                : 'Not connected'
        "
      />
    </header>

    <div class="flex flex-col gap-3 p-3">
      <!-- ── Primary action — one loud button, iOS filled style ──────────
           Rendered while we have ANY identity (loading, connected, or
           cached-but-offline). Hidden only on a cold disconnected state. -->
      <div v-if="isLoading || hasIdentity" class="flex flex-col gap-1.5">
        <Button
          size="lg"
          class="w-full text-[14px] font-semibold"
          :disabled="status === 'starting' || !isConnected"
          @click="startAnnotation"
        >
          <Icon name="map-pin" :size="16" :stroke-width="2.25" />
          Drop a pin
        </Button>
        <!-- One-line caption only when the button can't be used. -->
        <p
          v-if="!isConnected"
          class="text-center text-[11px] text-muted-foreground"
        >
          {{
            isLoading
              ? "Checking your session…"
              : conn === "offline"
                ? "Reconnect to start pinning"
                : "Connect a workspace to start"
          }}
        </p>
      </div>

      <!-- ── This page — one inset list card (iOS settings language).
           Rows: pins on this page (→ sub-view) · show-on-page switch ·
           floating launcher switch. Same hairline-separator container as
           the dashboard inbox, so both surfaces speak one dialect. -->
      <div
        v-if="hasIdentity || (pinsLoading && !showIdlePrompt)"
        class="overflow-hidden rounded-xl border border-border/70 bg-card"
      >
        <!-- Row 1: pins on this page (loading / error / count states) -->
        <div
          v-if="pinsLoading && !showIdlePrompt"
          class="flex min-h-[44px] items-center gap-2.5 px-3"
          aria-busy="true"
        >
          <span class="h-4 w-4 animate-pulse rounded bg-muted" />
          <span class="h-2.5 w-28 animate-pulse rounded bg-muted" />
          <span class="ml-auto h-5 w-7 animate-pulse rounded-full bg-muted" />
        </div>
        <button
          v-else-if="pinsError"
          type="button"
          class="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-muted/40"
          @click="fetchPinState"
        >
          <Icon
            name="alert-triangle"
            :size="15"
            :stroke-width="2"
            class="shrink-0 text-status-stale"
          />
          <span class="min-w-0 flex-1 truncate text-[13px] text-foreground">
            Couldn't load pins
          </span>
          <span class="flex shrink-0 items-center gap-1 text-[12px] font-medium text-primary">
            <Icon name="refresh-cw" :size="11" :stroke-width="2" /> Retry
          </span>
        </button>
        <button
          v-else
          type="button"
          :disabled="pageCounts.all === 0"
          class="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
          @click="openPinsView"
        >
          <Icon
            name="message-square"
            :size="15"
            :stroke-width="2"
            class="shrink-0 text-muted-foreground"
          />
          <span class="min-w-0 flex-1 truncate text-[13px] text-foreground">
            Pins on this page
          </span>
          <span
            v-if="pageCounts.all > 0"
            class="inline-flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-primary/12 px-1.5 text-[11px] font-semibold tabular-nums text-primary"
          >
            {{ pageCounts.all }}
          </span>
          <span v-else class="shrink-0 text-[12px] text-muted-foreground">
            None yet
          </span>
          <Icon
            v-if="pageCounts.all > 0"
            name="chevron-right"
            :size="14"
            class="shrink-0 text-muted-foreground/60"
          />
        </button>

        <!-- Row 2: show pins on page — real switch, not an ambiguous pill -->
        <div
          v-if="hasIdentity"
          class="flex min-h-[44px] items-center gap-2.5 border-t border-border/60 px-3"
        >
          <Icon
            name="eye"
            :size="15"
            :stroke-width="2"
            class="shrink-0 text-muted-foreground"
          />
          <span class="min-w-0 flex-1 truncate text-[13px] text-foreground">
            Show pins on page
          </span>
          <Switch
            :model-value="pageViewing"
            :disabled="!pageViewing && pageCounts.all === 0"
            aria-label="Show pins on page"
            @update:model-value="toggleViewPins"
          />
        </div>

        <!-- Row 3: floating launcher — global preference switch -->
        <div
          v-if="hasIdentity"
          class="flex min-h-[44px] items-center gap-2.5 border-t border-border/60 px-3"
        >
          <Icon
            name="map-pin"
            :size="15"
            :stroke-width="2"
            class="shrink-0 text-muted-foreground"
          />
          <span class="min-w-0 flex-1 truncate text-[13px] text-foreground">
            Floating launcher
          </span>
          <Switch
            :model-value="!launcherHidden"
            aria-label="Floating launcher"
            @update:model-value="toggleLauncher"
          />
        </div>
      </div>

      <!-- ── Identity / workspace switcher ─────────────────────────────────
           Single consolidated row (user primary, workspace secondary, switcher
           chevron). Section header dropped — the row stands on its own. -->
      <!-- LOADING: skeleton matches the single-row shape so the layout
           doesn't jump when data arrives. -->
      <div
        v-if="isLoading"
        class="overflow-hidden rounded-xl border border-border bg-card"
        aria-busy="true"
      >
        <div class="flex items-center gap-3 px-3 py-2.5">
          <span class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <span class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="h-2.5 w-24 animate-pulse rounded bg-muted" />
            <span class="h-2 w-32 animate-pulse rounded bg-muted/70" />
          </span>
        </div>
      </div>

        <!-- IDLE: not connected (or offline cold-start). Renders as the
             FULL popup body — Drop a pin, View pins, and the toggle row
             are already gated on hasIdentity above, so we just need the
             hero empty state here. -->
        <div
          v-else-if="showIdlePrompt"
          class="flex flex-col gap-3.5"
        >
          <!-- Hero icon + heading + lede. -->
          <div class="flex flex-col items-center gap-3 pt-2 text-center">
            <span
              class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Icon
                :name="conn === 'offline' ? 'cloud-off' : 'plug'"
                :size="22"
                :stroke-width="1.75"
              />
            </span>
            <div class="flex flex-col gap-1">
              <h2 class="text-[15px] font-semibold leading-tight text-foreground">
                {{
                  conn === "offline"
                    ? "Can't reach pinlay"
                    : "You're not connected"
                }}
              </h2>
              <p class="px-2 text-[12px] leading-snug text-muted-foreground">
                {{
                  conn === "offline"
                    ? "The pinlay API isn't responding. Check your connection and try again."
                    : "Sign in to drop pins on this page and share feedback with your workspace."
                }}
              </p>
            </div>
          </div>

          <!-- Primary CTAs: Connect / Create an account (offline → Try again). -->
          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_2px_8px_color-mix(in_oklab,var(--primary)_22%,transparent)] transition-colors hover:bg-primary-hover"
              @click="conn === 'offline' ? refresh() : onConnect()"
            >
              {{ conn === "offline" ? "Try again" : "Connect to Pinlay" }}
            </button>
            <button
              v-if="conn !== 'offline'"
              type="button"
              class="rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/50"
              @click="onCreateAccount"
            >
              Create an account
            </button>
          </div>

          <!-- What you can do — short value prop while signed-out. -->
          <div class="rounded-xl bg-muted/40 p-3">
            <p
              class="pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            >
              What you can do
            </p>
            <ul class="flex flex-col gap-1.5">
              <li
                v-for="bullet in [
                  'Pin any element with a click',
                  'Leave notes for your team in context',
                  'Track open feedback across pages',
                ]"
                :key="bullet"
                class="flex items-start gap-2 text-[12px] leading-snug text-foreground"
              >
                <span
                  class="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                {{ bullet }}
              </li>
            </ul>
          </div>
        </div>

        <!-- CONNECTED: consolidated identity row — user avatar + name
             primary, workspace + member count secondary, switcher chevron
             on the right. Single row replaces the previous two-row stack.
             NOTE: no `overflow-hidden` here — the switcher dropdown is
             absolute-positioned inside this card and gets clipped otherwise. -->
        <div
          v-else
          ref="switcherRootEl"
          class="relative rounded-xl border border-border bg-card"
        >
            <button
              type="button"
              :disabled="!isConnected"
              class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors enabled:hover:bg-muted/40 disabled:cursor-default"
              :aria-expanded="switcherOpen"
              aria-haspopup="listbox"
              @click="toggleSwitcher"
            >
              <!-- Same UserAvatar as the dashboard — real image, initials
                   fallback. Primary identity in this consolidated row. -->
              <UserAvatar
                :name="userLabel"
                :avatar-url="me?.avatarUrl ?? null"
                :size="32"
                class="shrink-0"
              />
              <span class="flex min-w-0 flex-1 flex-col gap-0">
                <span
                  class="truncate text-[13px] font-semibold leading-tight text-foreground"
                >
                  {{ userLabel }}
                </span>
                <span
                  class="truncate text-[11px] leading-tight text-muted-foreground"
                >
                  {{ workspaceLabel }}
                  <template v-if="workspace?.memberCount">
                    · {{ workspace.memberCount }} member{{
                      workspace.memberCount === 1 ? "" : "s"
                    }}
                  </template>
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
              class="absolute left-2 right-2 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg ring-1 ring-black/5"
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
                <!-- Active workspace is conveyed by the primary-colored
                     avatar; the trailing check icon was visual noise on top
                     of that. Only the per-row switching spinner remains. -->
                <Icon
                  v-if="switchingTo === ws.id"
                  name="loader-circle"
                  :size="13"
                  class="shrink-0 animate-spin text-muted-foreground"
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
      <!-- The standalone Preferences > Floating launcher row was removed —
           the toggle moved into the Hide pins | Floating launcher row at
           the top of the connected layout. -->


      <!-- ── Footer ──────────────────────────────────────────────────────── -->
      <!-- Hidden in the not-connected hero — the CTA above is enough. -->
      <div
        v-if="!showIdlePrompt"
        class="-mx-3 -mb-3 mt-1 flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2"
      >
        <!-- During loading, render a quiet placeholder rather than the wrong
             button — bouncing between Connect/Disconnect feels broken. While
             cached-but-offline we still show Disconnect (the user has an
             identity to clear, even if the network is down). -->
        <span v-if="isLoading" class="h-5 w-16" />
        <Button
          v-else
          variant="ghost"
          size="sm"
          class="text-destructive hover:bg-destructive/10 hover:text-destructive"
          @click="onDisconnect"
        >
          <Icon name="log-out" :size="13" :stroke-width="2" />
          Disconnect
        </Button>

        <Button variant="ghost" size="sm" class="text-muted-foreground" @click="openDashboard">
          Dashboard
          <Icon name="arrow-up-right" :size="12" :stroke-width="2" />
        </Button>
      </div>
    </div>
    </template>
  </div>
</template>
