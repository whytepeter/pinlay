<!--
  FloatingLauncher — floating action button + compact command menu.
  Injected into every page via the content script (shadow DOM).

  Surfaces:
    • IDLE        — white FAB with the violet pinlay Brand mark. Clicking it
                    opens a minimal action menu (Drop a pin + Hide launcher).
                    Account chrome (user, workspace, disconnect) lives on the
                    toolbar popup — NOT here. See cerebrum 2026-05-28.
    • ANNOTATING  — primary (violet) FAB with the Brand mark + a pin-count
                    badge. Clicking opens the control menu: "Start pinning" /
                    "Cancel pinning" / "View pins" / "Done". The FAB is the
                    single control surface during annotation.

  Recording / screenshot paths removed — pinlay is annotation-only for v1.
-->
<template>
  <!-- Hide the entire launcher chrome when the user has dismissed it via
       the menu (`Hide launcher on this page`) AND no annotation is running.
       During annotation we always show — never strand the user without
       controls mid-session. Bring it back via the extension popup toggle. -->
  <div v-if="!hidden || annotationActive" class="pointer-events-auto">
    <!-- Drag handle — appears on hover (or while dragging) just left of the
         FAB. Only drag affordance; the FAB itself is click-only. -->
    <button
      v-show="hovering || dragging"
      type="button"
      aria-label="Drag pinlay button"
      :style="handleStyle"
      :class="[
        'fixed z-[2147483647] flex h-7 w-6 items-center justify-center rounded-md',
        'border border-[rgba(0,0,0,0.08)] bg-card text-muted-foreground',
        'shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-colors hover:text-foreground',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      ]"
      @pointerdown.stop="onHandlePointerDown"
      @click.stop
      @mouseenter="onHoverEnter"
      @mouseleave="onHoverLeave"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5">
        <circle cx="9" cy="6" r="1.4" />
        <circle cx="15" cy="6" r="1.4" />
        <circle cx="9" cy="12" r="1.4" />
        <circle cx="15" cy="12" r="1.4" />
        <circle cx="9" cy="18" r="1.4" />
        <circle cx="15" cy="18" r="1.4" />
      </svg>
    </button>

    <button
      type="button"
      :aria-label="fabAriaLabel"
      :style="fabStyle"
      :class="[
        'fixed z-[2147483647]',
        'flex h-11 w-11 items-center justify-center rounded-full',
        'border cursor-pointer transition-[background-color,box-shadow,border-color,transform] duration-150',
        'focus-visible:outline-none active:scale-[0.95]',
        justActivated && 'pl-fab-attention',
      ]"
      @click.stop="toggleMenu"
      @mouseenter="onHoverEnter"
      @mouseleave="onHoverLeave"
    >
      <!-- Attention pulse on annotation activation — primary so it harmonises
           with the active FAB surface. -->
      <template v-if="justActivated">
        <span
          class="pointer-events-none absolute inset-0 rounded-full bg-primary/60 animate-ping"
        />
        <span
          class="pointer-events-none absolute -inset-1 rounded-full ring-2 ring-primary/50 animate-pulse"
        />
      </template>

      <Transition
        enter-active-class="transition-[opacity,transform] duration-100"
        enter-from-class="opacity-0 scale-75"
        leave-active-class="transition-[opacity,transform] duration-100"
        leave-to-class="opacity-0 scale-75"
        mode="out-in"
      >
        <Icon v-if="menuOpen" key="close" name="x" :size="16" :stroke-width="2.5" />
        <Brand v-else key="brand" :size="20" />
      </Transition>

      <!-- Pin-count badge — white pill so it contrasts against the primary
           FAB during annotation. -->
      <span
        v-if="annotationActive && pinCount > 0 && !menuOpen"
        class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-card px-1 text-[10px] font-bold leading-none text-primary ring-2 ring-primary"
      >
        {{ pinCount }}
      </span>
    </button>

    <!-- Command menu -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.96]"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-2 scale-[0.96]"
    >
      <div
        v-if="menuOpen"
        @click.stop
        :style="{ ...menuStyle, pointerEvents: 'auto' }"
        class="fixed z-[2147483647] w-[248px]
               rounded-2xl border border-border bg-card p-1.5
               shadow-[0_16px_48px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08)]"
      >
        <!-- ConnectPrompt auth gate disabled until apps/api lands. Re-add
             <ConnectPrompt v-if="!auth" /> here + flip the v-else-if below
             back to v-if to restore. -->

        <!-- Menu only opens while annotation is active. When idle the FAB
             click dispatches start-annotation directly (single-action UX). -->
        <template v-if="annotationActive">
          <!-- PINS sub-view: list of pins on the page, with a back button. -->
          <template v-if="menuView === 'pins'">
            <div class="flex items-center gap-1.5 px-1.5 pb-1.5 pt-1">
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Back"
                @click="menuView = 'main'"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-3.5 w-3.5"
                >
                  <path d="M15 18 l-6 -6 l6 -6" />
                </svg>
              </button>
              <span class="text-[12px] font-semibold text-foreground">
                Pins
                <span class="text-muted-foreground">· {{ pinRows.length }}</span>
              </span>
            </div>

            <div class="px-1.5 pb-1.5">
              <input
                v-model="pinFilter"
                type="text"
                placeholder="Filter pins"
                class="w-full rounded-md border border-border bg-background px-2 h-7 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div class="max-h-[260px] overflow-y-auto">
              <p
                v-if="filteredPinRows.length === 0"
                class="px-2.5 py-4 text-center text-[11px] text-muted-foreground"
              >
                {{ pinRows.length === 0 ? "No pins yet." : "No matches." }}
              </p>
              <button
                v-for="row in filteredPinRows"
                :key="row.id"
                type="button"
                class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary"
                @click="onJumpToPin(row.id)"
              >
                <span
                  class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  :class="row.dotBg"
                >
                  {{ row.index }}
                </span>
                <span class="min-w-0 flex-1">
                  <span
                    class="block truncate text-[12px] font-medium text-foreground"
                    >{{ row.title || "Untitled pin" }}</span
                  >
                  <span
                    class="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"
                  >
                    <span class="capitalize">{{ row.statusLabel }}</span>
                    <span v-if="row.stale" class="text-status-stale">· stale</span>
                  </span>
                </span>
              </button>
            </div>
          </template>

          <!-- MAIN annotation controls. -->
          <template v-else>
            <p
              class="flex items-center justify-between px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              <span>Annotation</span>
              <span class="font-mono normal-case tracking-normal">
                {{ pinCount }} {{ pinCount === 1 ? "pin" : "pins" }}
              </span>
            </p>

            <LauncherItem
              v-if="annotationMode === 'view'"
              icon="annotate"
              label="Start pinning"
              description="Click an element to drop a pin"
              @click="onStartPinning"
            />
            <LauncherItem
              v-else
              icon="close"
              label="Cancel pinning"
              description="Stop placing, keep existing pins"
              @click="onCancelPinning"
            />

            <LauncherItem
              v-if="pinCount > 0"
              icon="list"
              label="View pins"
              description="Browse + jump to pins"
              @click="menuView = 'pins'"
            />

            <LauncherItem
              icon="check"
              label="Done"
              description="Exit annotation"
              @click="onDoneAnnotation"
            />
          </template>
        </template>

        <!-- IDLE — primary action + hide. Account chrome lives on the
             toolbar popup, not here. -->
        <template v-else>
          <LauncherItem
            icon="annotate"
            label="Drop a pin"
            description="Click an element to start"
            @click="onStartIdleAnnotation"
          />

          <div class="my-1 border-t border-border" />

          <!-- Hide launcher (on this page only). To bring it back, the user
               opens the toolbar popup → toggles "Show floating launcher". -->
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12px] text-foreground transition-colors hover:bg-secondary"
            @click="onHideLauncher"
          >
            <Icon
              name="eye-off"
              :size="14"
              :stroke-width="1.75"
              class="text-muted-foreground"
            />
            <span>Hide launcher</span>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { Brand, Icon } from "@pinlay/design";
import LauncherItem from "./LauncherItem.vue";
// ConnectPrompt import removed while the auth gate is disabled. Restore
// `import ConnectPrompt from "./ConnectPrompt.vue";` when apps/api lands.
import { getAuth, onAuthChange, type StoredAuth } from "../../lib/auth";
import { useAnnotationState } from "../../lib/annotation-state";

const menuOpen = ref(false);
const auth = ref<StoredAuth | null>(null);

// Visibility — persisted via chrome.storage.local so the popup can toggle
// it too. When `hidden` is true the FAB doesn't render UNLESS annotation is
// active (we never strand the user mid-annotation with no controls).
const FAB_HIDDEN_KEY = "pl_fab_hidden";
const hidden = ref(false);

// User + workspace chips shown in the idle menu. Wire to useSettings / the
// API later — for now we render readable placeholders so the layout is real.
const userInitial = computed(() => "Y");
const userLabel = computed(() => "You");
const userSubtext = computed(() => (auth.value ? "Connected" : "Local mode"));
const workspaceLabel = computed(() =>
  auth.value ? "Acme Inc" : "Local workspace",
);
const workspaceSubtext = computed(() =>
  auth.value ? "Pro plan" : "Not connected",
);

// ── Draggable position ───────────────────────────────────────────────────────
const FAB_SIZE = 44;
const MARGIN = 20;
const POS_KEY = "pl_fab_pos";
const MENU_WIDTH = 248;

const fabPos = ref<{ left: number; top: number }>({ left: 0, top: 0 });
const dragging = ref(false);

function defaultPos() {
  return {
    left: window.innerWidth - FAB_SIZE - MARGIN,
    top: window.innerHeight - FAB_SIZE - MARGIN,
  };
}
function clampPos(p: { left: number; top: number }) {
  return {
    left: Math.max(8 + 28, Math.min(p.left, window.innerWidth - FAB_SIZE - 8)),
    top: Math.max(8, Math.min(p.top, window.innerHeight - FAB_SIZE - 8)),
  };
}

// ── Hover (show drag handle) ─────────────────────────────────────────────────
const hovering = ref(false);
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
function onHoverEnter() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  hovering.value = true;
}
function onHoverLeave() {
  if (hoverTimer) clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    hovering.value = false;
  }, 200);
}

// ── Drag (handle only) ───────────────────────────────────────────────────────
let pointerStart = { x: 0, y: 0 };
let posStart = { left: 0, top: 0 };

function onHandlePointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  pointerStart = { x: e.clientX, y: e.clientY };
  posStart = { ...fabPos.value };
  dragging.value = true;
  hovering.value = true;
  window.addEventListener("pointermove", onHandlePointerMove);
  window.addEventListener("pointerup", onHandlePointerUp);
}
function onHandlePointerMove(e: PointerEvent) {
  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  fabPos.value = clampPos({ left: posStart.left + dx, top: posStart.top + dy });
}
function onHandlePointerUp() {
  window.removeEventListener("pointermove", onHandlePointerMove);
  window.removeEventListener("pointerup", onHandlePointerUp);
  dragging.value = false;
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(fabPos.value));
  } catch {
    /* ignore */
  }
}

function onWindowResize() {
  fabPos.value = clampPos(fabPos.value);
}

const handleStyle = computed<Record<string, string>>(() => ({
  left: `${fabPos.value.left - 28}px`,
  top: `${fabPos.value.top + (FAB_SIZE - 28) / 2}px`,
}));

const menuStyle = computed<Record<string, string>>(() => {
  const left = Math.max(
    8,
    Math.min(
      fabPos.value.left + FAB_SIZE - MENU_WIDTH,
      window.innerWidth - MENU_WIDTH - 8,
    ),
  );
  const openUp = fabPos.value.top > window.innerHeight / 2;
  return openUp
    ? { left: `${left}px`, bottom: `${window.innerHeight - fabPos.value.top + 8}px` }
    : { left: `${left}px`, top: `${fabPos.value.top + FAB_SIZE + 8}px` };
});

// ── Shared annotation state ──────────────────────────────────────────────────
const annotationState = useAnnotationState();
const annotationActive = annotationState.active;
const annotationMode = annotationState.mode;
const pinCount = annotationState.pinCount;
const pinRows = annotationState.pinRows;

const menuView = ref<"main" | "pins">("main");
const pinFilter = ref("");
const filteredPinRows = computed(() => {
  const q = pinFilter.value.trim().toLowerCase();
  if (!q) return pinRows.value;
  return pinRows.value.filter((r) => r.title.toLowerCase().includes(q));
});

// (Existing-pin count fetch removed — the default menu is gone, so there's
// nowhere to surface the count. The overlay still fetches its own pins on
// mount via api.getPagePins when auth is wired.)

// Attention burst when annotation activates.
const justActivated = ref(false);
let attentionTimer: ReturnType<typeof setTimeout> | null = null;
watch(annotationActive, (active) => {
  if (!active) {
    justActivated.value = false;
    menuView.value = "main";
    return;
  }
  justActivated.value = true;
  if (attentionTimer) clearTimeout(attentionTimer);
  attentionTimer = setTimeout(() => {
    justActivated.value = false;
  }, 3200);
});

const fabAriaLabel = computed(() => {
  if (menuOpen.value) return "Close pinlay";
  if (annotationActive.value) return "Annotation controls";
  return "Open pinlay";
});

const fabStyle = computed<Record<string, string>>(() => {
  const pos = { left: `${fabPos.value.left}px`, top: `${fabPos.value.top}px` };
  // Active (menu open OR annotation running) → primary surface.
  if (menuOpen.value || annotationActive.value) {
    return {
      ...pos,
      backgroundColor: "var(--primary)",
      color: "var(--primary-foreground)",
      borderColor: "transparent",
      boxShadow:
        "0 4px 16px color-mix(in oklab, var(--primary) 30%, transparent)",
    };
  }
  // Idle → white card with the violet brand mark.
  return {
    ...pos,
    backgroundColor: "#ffffff",
    color: "var(--primary)",
    borderColor: "var(--border)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)",
  };
});

function toggleMenu() {
  // Always toggle — both idle and annotation states have a menu.
  // Idle menu = Drop a pin + user/workspace chips + Hide launcher + Disconnect.
  // Annotation menu = Start / Cancel / View pins / Done.
  menuOpen.value = !menuOpen.value;
}
function closeMenu() {
  menuOpen.value = false;
  menuView.value = "main";
}

// ── Idle menu actions ────────────────────────────────────────────────────────
function onStartIdleAnnotation() {
  closeMenu();
  window.dispatchEvent(new CustomEvent("pinlay:start-annotation"));
}
function onHideLauncher() {
  closeMenu();
  hidden.value = true;
  void persistHidden(true);
}
function onDisconnect() {
  if (!auth.value) return;
  closeMenu();
  void (async () => {
    const { clearAuth } = await import("../../lib/auth");
    await clearAuth();
  })();
}

async function persistHidden(value: boolean) {
  try {
    await chrome.storage.local.set({ [FAB_HIDDEN_KEY]: value });
  } catch {
    /* storage unavailable — fail silent */
  }
}

// ── Annotation controls ──────────────────────────────────────────────────────
function onStartPinning() {
  closeMenu();
  annotationState.requestPlace();
}
function onCancelPinning() {
  closeMenu();
  annotationState.requestCancel();
}
function onDoneAnnotation() {
  closeMenu();
  annotationState.requestExit();
}
function onJumpToPin(id: string) {
  // Keep the list open while jumping so the user can browse + jump quickly.
  annotationState.requestJump(id);
}

function onDocClick() {
  closeMenu();
}

let unsubscribeAuth: (() => void) | null = null;

let storageHandler:
  | ((
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => void)
  | null = null;

onMounted(async () => {
  let saved: { left: number; top: number } | null = null;
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) saved = JSON.parse(raw) as { left: number; top: number };
  } catch {
    /* ignore */
  }
  fabPos.value = clampPos(saved ?? defaultPos());

  document.addEventListener("click", onDocClick);
  window.addEventListener("resize", onWindowResize);
  auth.value = await getAuth();
  unsubscribeAuth = onAuthChange((next) => {
    auth.value = next;
  });

  // Read initial hidden state + subscribe to changes (popup also writes).
  try {
    const data = await chrome.storage.local.get(FAB_HIDDEN_KEY);
    hidden.value = !!data[FAB_HIDDEN_KEY];
  } catch {
    /* ignore */
  }
  storageHandler = (changes, area) => {
    if (area !== "local") return;
    if (FAB_HIDDEN_KEY in changes) {
      hidden.value = !!changes[FAB_HIDDEN_KEY].newValue;
    }
  };
  try {
    chrome.storage.onChanged.addListener(storageHandler);
  } catch {
    /* ignore */
  }
});
onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
  window.removeEventListener("resize", onWindowResize);
  window.removeEventListener("pointermove", onHandlePointerMove);
  window.removeEventListener("pointerup", onHandlePointerUp);
  unsubscribeAuth?.();
  if (storageHandler) {
    try {
      chrome.storage.onChanged.removeListener(storageHandler);
    } catch {
      /* ignore */
    }
  }
  if (attentionTimer) clearTimeout(attentionTimer);
  if (hoverTimer) clearTimeout(hoverTimer);
});
</script>

<style scoped>
/* Single bounce when annotation activates, layered on top of the ping rings
   so the FAB physically nudges to catch the eye. Local because the shadow
   root doesn't share the page's stylesheet. */
@keyframes pl-fab-bounce {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(1.18);
  }
  55% {
    transform: scale(0.94);
  }
  80% {
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
  }
}
.pl-fab-attention {
  animation: pl-fab-bounce 0.6s ease-in-out;
}
</style>
