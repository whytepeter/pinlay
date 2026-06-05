<!--
  AnnotationOverlay
  ─────────────────
  Top-level orchestrator for the live-annotation flow, with two modes:

    VIEW (default):
      • Page is fully interactive — root has pointer-events:none.
      • Existing pins for this URL are fetched + rendered. Clicking a pin
        opens AnnotationPinDetail with the stored comment.
      • The FloatingLauncher IS the toolbar — Start / Cancel / Done lives there.

    PLACE:
      • A click-capture layer covers the page. Cursor: crosshair.
      • Hover an element → outline highlight. Click → describe element,
        drop a draft pin, open AnnotationPinComposer.
      • Submit → POST /annotation/pins, pin turns violet + persists.
      • Cancel / Esc → drop the draft pin, return to VIEW.

  Persistence: existing pins survive because each pin is a row in the org's
  pins table. Visiting the same URL again + entering annotation refetches
  them via /annotation/pins.
-->
<template>
  <!-- Outer layer is INERT by default — pointer-events:none lets every page
       click pass through. Children opt back in. -->
  <div class="fixed inset-0 z-[2147483640] pointer-events-none">
    <!-- Connection banner: pins aren't persisting. Only shown while an
         annotation session is active — silent in passive developer-overlay
         view so we don't nag every page load. -->
    <div
      v-if="(apiState === 'disconnected' || apiState === 'offline') && mode === 'place'"
      class="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border border-status-stale/30 bg-card px-3 py-2 text-[12px] shadow-md"
    >
      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-status-stale" />
      <span class="text-foreground">
        {{
          apiState === "disconnected"
            ? "Not connected — pins are saved locally only."
            : "Can't reach pinlay — pins are saved locally only."
        }}
      </span>
      <button
        v-if="apiState === 'disconnected'"
        type="button"
        class="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        @click="openConnect"
      >
        Connect
      </button>
    </div>

    <!-- First-pin coach card (Roadmap 7.1) — fires the first time a fresh
         user enters PLACE mode. Stays visible while they compose (so they
         have time to read) and auto-dismisses when the first pin lands. -->
    <div
      v-if="showOnboarding && mode === 'place'"
      class="pointer-events-auto absolute left-1/2 top-3 z-[1] flex w-[320px] -translate-x-1/2 items-start gap-3 rounded-xl border border-primary/25 bg-card px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
    >
      <span
        class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
        >
          <path d="M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="text-[13px] font-semibold leading-tight text-foreground">
          Click any element to pin it
        </p>
        <p class="text-[11.5px] leading-snug text-muted-foreground">
          Hover to highlight, click to attach a note. Press <kbd class="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">Esc</kbd> to cancel.
        </p>
      </div>
      <button
        type="button"
        class="-mr-1 -mt-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        @click="dismissOnboarding"
      >
        Got it
      </button>
    </div>

    <!-- PLACE-mode capture layer: covers the page only while picking AND no
         composer is open. The second guard keeps composer clicks from being
         stolen by the layer. -->
    <div
      v-if="mode === 'place' && !composingPin"
      class="absolute inset-0 pointer-events-auto"
      style="cursor: crosshair"
      @click.stop="onPlaceClick"
      @mousemove.passive="onPlaceMove"
    >
      <div
        v-if="hover"
        class="absolute pointer-events-none rounded-sm transition-[transform,width,height] duration-75"
        :style="{
          left: hover.x + 'px',
          top: hover.y + 'px',
          width: hover.w + 'px',
          height: hover.h + 'px',
          background: 'color-mix(in oklab, var(--primary) 8%, transparent)',
          outline: '2px solid var(--primary)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
        }"
      />
    </div>

    <!-- Pins (existing + draft + just-submitted). Positions are VIEWPORT
         coords recomputed on scroll/resize. -->
    <AnnotationPin
      v-for="r in renderedPins"
      :key="r.pin.id"
      :index="r.pin.index"
      :page-x="r.x"
      :page-y="r.y"
      :severity="pinSeverity(r.pin)"
      :status="pinStatus(r.pin)"
      :state="r.pin.state"
      :stale="r.stale"
      :health="r.health"
      @open="openPin(r.pin.id)"
    />

    <!-- Suggested re-anchor target (Roadmap 1.3): live highlight over the
         element we think the stale pin moved to. -->
    <div
      v-if="suggestionRect"
      class="absolute pointer-events-none rounded-sm"
      :style="{
        left: suggestionRect.x + 'px',
        top: suggestionRect.y + 'px',
        width: suggestionRect.w + 'px',
        height: suggestionRect.h + 'px',
        background: 'color-mix(in oklab, var(--sev-medium) 12%, transparent)',
        outline: '2px dashed var(--sev-medium)',
        outlineOffset: '1px',
      }"
    >
      <span
        class="absolute -top-5 left-0 whitespace-nowrap rounded bg-sev-medium px-1.5 py-0.5 text-[10px] font-semibold text-white"
      >
        Did this pin move here?
      </span>
    </div>

    <!-- Composer for a freshly-dropped pin. -->
    <AnnotationPinComposer
      v-if="composingPin"
      :index="composingPin.index"
      :page-x="composerPos.x"
      :page-y="composerPos.y"
      :selector="composerSelector"
      :submitting="composingPin.submitting"
      :error="composingPin.error"
      :members="members"
      @submit="onComposerSubmit"
      @cancel="onComposerCancel"
    />

    <!-- Detail popover for an existing pin. -->
    <AnnotationPinDetail
      v-if="viewingPin"
      :index="viewingPin.index"
      :page-x="detailPos.x"
      :page-y="detailPos.y"
      :comment="viewingPin.comment"
      :severity="viewingPin.severity"
      :issue-type="viewingPin.issueType"
      :status="viewingPin.status"
      :attachments="viewingPin.attachments"
      :author="viewingPin.author"
      :created-at="viewingPin.createdAt"
      :updating="statusUpdatingId === viewingPin.id"
      :stale="detailPos.stale"
      :suggestion="
        reanchorSuggestion ? { confidence: reanchorSuggestion.confidence } : null
      "
      @close="viewingPinId = null"
      @reanchor="startReanchor(viewingPin.id)"
      @accept-suggestion="acceptSuggestion"
      @change-status="onChangeStatus(viewingPin.id, $event)"
    />

    <!-- Finish-review dialog — names the grouped issue on Done. -->
    <div
      v-if="finishing"
      class="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center"
      style="background: rgba(0,0,0,0.45)"
      @click.self="cancelFinish"
    >
      <div
        class="w-[360px] rounded-xl border border-border bg-card p-4 shadow-[0_24px_64px_rgba(0,0,0,0.3)]"
      >
        <h3 class="text-[14px] font-semibold text-foreground">Finish review</h3>
        <p class="mt-1 text-[12px] text-muted-foreground">
          {{ sessionPinCount }} pin{{ sessionPinCount === 1 ? "" : "s" }} will be
          grouped into one issue.
        </p>
        <label
          class="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >Title</label
        >
        <input
          v-model="reviewTitle"
          type="text"
          class="mt-1 block w-full rounded-md border border-border bg-background px-2.5 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
          @keydown.enter.prevent="confirmFinish"
        />

        <div
          v-if="priorPinsCount > 0"
          class="mt-3 flex items-start gap-2 rounded-md border border-status-stale/30 bg-status-stale/10 px-2.5 py-2 text-[11px] text-status-stale"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mt-px h-3 w-3 shrink-0"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>{{ priorPinsCount }} pin{{ priorPinsCount === 1 ? "" : "s" }}</strong>
            from a previous session already exist on this page and will not be
            affected.
          </span>
        </div>

        <p class="mt-2 text-[10px] text-muted-foreground">
          This review will be visible to all workspace members.
        </p>

        <div class="mt-3 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" :disabled="finishBusy" @click="cancelFinish"
            >Keep editing</Button
          >
          <Button
            variant="default"
            size="sm"
            :disabled="finishBusy"
            @click="confirmFinish"
            >Submit review</Button
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Button } from "@pinlay/design";
import AnnotationPin from "./AnnotationPin.vue";
import AnnotationPinComposer, { type PinDraft } from "./AnnotationPinComposer.vue";
import AnnotationPinDetail from "./AnnotationPinDetail.vue";
import type { PinListRow } from "../../lib/annotation-state";
import {
  anchorHealth,
  describeAnchor,
  resolveAnchor,
  suggestReanchor,
  type AnchorHealth,
  type PinAnchor,
  type ReanchorSuggestion,
} from "../../lib/anchor";
import {
  api,
  ApiError,
  type AnnotationPinRow,
  type WorkspaceMember,
} from "../../lib/api";
import { normalizeUrl } from "@pinlay/shared";
import { WEB_APP_URL } from "../../lib/env";
import { safeSendMessage } from "../../lib/extension";
import { useAnnotationState } from "../../lib/annotation-state";
import type { Severity, Status, PinType } from "@pinlay/shared";
import type { StoredAuth } from "../../lib/auth";

interface BrowserMeta {
  pageUrl: string;
  pageTitle: string;
  userAgent: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
}

const props = defineProps<{
  browserMeta: BrowserMeta;
  auth: StoredAuth | null;
}>();

// ── Shared state w/ launcher ────────────────────────────────────────────────
const state = useAnnotationState();

// ── Mode ────────────────────────────────────────────────────────────────────
const mode = ref<"view" | "place">("view");

function enterPlaceMode() {
  if (composingPin.value) return;
  viewingPinId.value = null;
  mode.value = "place";
  state.setMode("place");
  // Mark the annotation session active — flips the FAB into annotation
  // controls. The overlay itself may have been mounted passively (view mode)
  // long before this; "active" tracks the SESSION, not the mount.
  state.setActive(true);
  // First-pin coach card (Roadmap 7.1) — fires the first time a fresh user
  // enters PLACE mode. Storage is checked async so the UI never blocks.
  void maybeShowOnboarding();
}
function exitPlaceMode() {
  hover.value = null;
  mode.value = "view";
  state.setMode("view");
  // End of session — but the overlay stays mounted so pins keep rendering
  // passively. FAB returns to idle.
  state.setActive(false);
}

// Close the composer but STAY in place mode so the user can drop another pin
// immediately. Place mode is sticky: the user exits explicitly via Escape or
// the floating-launcher "Cancel pinning" / "Done" — never as a side-effect of
// submitting a single pin.
function closeComposerStayPlace() {
  composingPinId.value = null;
  hover.value = null;
  // Defensive: ensure place mode is set in case caller flipped it elsewhere.
  if (mode.value !== "place") {
    mode.value = "place";
    state.setMode("place");
  }
}

watch(
  () => state.placeRequested.value,
  (v, prev) => {
    if (v !== prev) enterPlaceMode();
  },
);
watch(
  () => state.cancelRequested.value,
  (v, prev) => {
    if (v !== prev) exitPlaceMode();
  },
);
watch(
  () => state.exitRequested.value,
  (v, prev) => {
    if (v !== prev) onDone();
  },
);

// ── Grouped-pin model ───────────────────────────────────────────────────────
const sessionId = ref<string | null>(null);
const issueId = ref<string | null>(null);
const members = ref<WorkspaceMember[]>([]);

interface PinAttachment {
  name: string;
  mime: string;
  dataUrl: string;
  size: number;
  dimensions?: { w: number; h: number };
}

interface ExistingPin {
  kind: "existing";
  id: string;
  issueId: string | null;
  index: number;
  pageX: number;
  pageY: number;
  anchor: PinAnchor;
  severity: Severity;
  status: Status;
  state: "submitted";
  comment: string;
  issueType: string | null;
  attachments?: PinAttachment[];
  author?: { name: string; avatarHue?: number };
  createdAt?: string;
}
interface DraftPin {
  kind: "draft" | "submitted";
  id: string;
  index: number;
  pageX: number;
  pageY: number;
  anchor: PinAnchor;
  draft: PinDraft;
  state: "draft" | "submitted";
  submitting: boolean;
  error?: string;
}
type Pin = ExistingPin | DraftPin;

const existingPins = ref<ExistingPin[]>([]);
const localPins = ref<DraftPin[]>([]);

const visiblePins = computed<Pin[]>(() => [
  ...existingPins.value,
  ...localPins.value,
]);

// ── Viewport positioning ────────────────────────────────────────────────────
const viewportTick = ref(0);
let rafPending = false;
function onViewportChange() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    viewportTick.value++;
    rafPending = false;
  });
}

function viewportPos(
  pin: Pin,
): { x: number; y: number; stale: boolean; health: AnchorHealth } {
  const anchor = pin.anchor;
  const resolved = resolveAnchor(anchor);
  if (resolved) {
    const r = resolved.el.getBoundingClientRect();
    return {
      x: r.left + anchor.offset.xPct * r.width,
      y: r.top + anchor.offset.yPct * r.height,
      stale: false,
      health: anchorHealth(resolved.confidence),
    };
  }
  return {
    x: pin.pageX - window.scrollX,
    y: pin.pageY - window.scrollY,
    stale: true,
    health: "dead",
  };
}

interface RenderedPin {
  pin: Pin;
  x: number;
  y: number;
  stale: boolean;
  health: AnchorHealth;
}
const renderedPins = computed<RenderedPin[]>(() => {
  void viewportTick.value;
  return visiblePins.value.map((pin) => {
    const { x, y, stale, health } = viewportPos(pin);
    // Health/stale only mean something for persisted pins — a draft is being
    // placed live on the element under the cursor, so it's always healthy.
    const existing = pin.kind === "existing";
    return { pin, x, y, stale: existing && stale, health: existing ? health : "ok" };
  });
});

const composerPos = computed(() => {
  void viewportTick.value;
  return composingPin.value
    ? viewportPos(composingPin.value)
    : { x: 0, y: 0, stale: false, health: "ok" as AnchorHealth };
});

// Short, dev-tools-style label of the clicked element shown in the composer
// header (e.g. `button[data-testid="submit"]` or `div:nth-of-type(3)`).
const composerSelector = computed(() => {
  if (!composingPin.value) return "";
  const sel = composingPin.value.anchor.selector;
  return sel.split(" > ").pop() ?? composingPin.value.anchor.tag;
});
const detailPos = computed(() => {
  void viewportTick.value;
  return viewingPin.value
    ? viewportPos(viewingPin.value)
    : { x: 0, y: 0, stale: false, health: "ok" as AnchorHealth };
});

// ── Suggested re-anchor (Roadmap 1.3) ────────────────────────────────────────
// When the viewed pin is dead (stale), fuzzily propose where it likely moved.
const reanchorSuggestion = computed<ReanchorSuggestion | null>(() => {
  void viewportTick.value;
  const pin = viewingPin.value;
  if (!pin || !detailPos.value.stale) return null;
  return suggestReanchor(pin.anchor);
});

// Live highlight box over the suggested element (better than a static thumbnail
// — it's the actual element on the actual page).
const suggestionRect = computed(() => {
  void viewportTick.value;
  const s = reanchorSuggestion.value;
  if (!s) return null;
  const r = s.el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});

// ── Pin-list rows ────────────────────────────────────────────────────────────
const STATUS_DOT_BG: Record<string, string> = {
  open: "bg-status-open",
  in_progress: "bg-status-progress",
  resolved: "bg-status-resolved",
  draft: "bg-muted",
  archived: "bg-muted",
};
const SEVERITY_DOT_BG: Record<Severity, string> = {
  low: "bg-sev-low",
  medium: "bg-sev-medium",
  high: "bg-sev-high",
  critical: "bg-sev-critical",
};

const pinListRows = computed<PinListRow[]>(() =>
  renderedPins.value.map((r) => {
    const status = pinStatus(r.pin);
    return {
      id: r.pin.id,
      index: r.pin.index,
      title:
        r.pin.kind === "existing" ? r.pin.comment : r.pin.draft.comment,
      statusLabel: status ? status.replace(/_/g, " ") : "draft",
      dotBg: status
        ? (STATUS_DOT_BG[status] ?? "bg-muted")
        : SEVERITY_DOT_BG[pinSeverity(r.pin)],
      stale: r.stale,
      health: r.health,
    };
  }),
);

async function onJumpToPin(pinId: string) {
  // Wait for the initial pin fetch to finish — the deep-link path
  // (#pinlay-pin=<id> on page-load) bumps requestJump BEFORE the overlay's
  // apiProbe has populated existingPins, which used to silently no-op when
  // the pin wasn't found yet. await + nextTick gives the reactive flush a
  // beat to land before we look up the pin.
  await apiProbe;
  await nextTick();
  const pin = visiblePins.value.find((p) => p.id === pinId);
  if (!pin) return;
  const resolved = resolveAnchor(pin.anchor);
  if (resolved) {
    resolved.el.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    window.scrollTo({
      top: Math.max(0, pin.pageY - window.innerHeight / 2),
      behavior: "smooth",
    });
  }
  openPin(pinId);
}

function pinSeverity(pin: Pin): Severity {
  return pin.kind === "existing" ? pin.severity : pin.draft.severity;
}
function pinStatus(pin: Pin): Status | undefined {
  if (pin.kind === "existing") return pin.status;
  return pin.state === "submitted" ? "open" : undefined;
}

// The pin currently in composer (only ever a DraftPin in `draft` state).
const composingPinId = ref<string | null>(null);
const composingPin = computed<DraftPin | null>(() => {
  if (!composingPinId.value) return null;
  const pin = localPins.value.find((p) => p.id === composingPinId.value);
  return pin && pin.state === "draft" ? pin : null;
});

// The pin currently shown in detail popover.
const viewingPinId = ref<string | null>(null);
const viewingPin = computed<ExistingPin | null>(() => {
  if (!viewingPinId.value) return null;
  return existingPins.value.find((p) => p.id === viewingPinId.value) ?? null;
});

// ── Hydrate existing pins ───────────────────────────────────────────────────
// ── First-pin onboarding coach card (Roadmap 7.1) ────────────────────────────
// Shows on a fresh install the first time the user enters PLACE mode. Auto-
// dismisses when the first pin lands (or the user clicks Got it). Tracked in
// chrome.storage.local so it's once-per-user, not once-per-page.
const ONBOARDING_KEY = "pl_first_pin_onboarded";
const showOnboarding = ref(false);
let onboardingChecked = false;
async function maybeShowOnboarding() {
  if (onboardingChecked) return;
  onboardingChecked = true;
  try {
    const r = await chrome.storage.local.get(ONBOARDING_KEY);
    if (!r[ONBOARDING_KEY]) showOnboarding.value = true;
  } catch {
    /* storage unavailable — silently skip */
  }
}
async function dismissOnboarding() {
  showOnboarding.value = false;
  try {
    await chrome.storage.local.set({ [ONBOARDING_KEY]: true });
  } catch {
    /* ignore */
  }
}
// Auto-dismiss when the first pin lands — the user's clearly figured it out.
watch(
  () => existingPins.value.length,
  (now, prev) => {
    if (showOnboarding.value && now > (prev ?? 0)) {
      void dismissOnboarding();
    }
  },
);

// Note: `state.setActive(true)` lives in enterPlaceMode now, not here.
// The overlay can be mounted passively (developer-overlay view) without
// making the FAB look like an annotation session is in progress.

// Connection state — resolved by one probe at startup. Three outcomes:
//   "ready"         → request authenticated; pins persist to the API.
//   "disconnected"  → 401: no/invalid token. The user must Connect (we surface
//                     a banner + the launcher reflects it); pins still fall to
//                     local mode so a click is never lost, but we tell them.
//   "offline"       → transport failure (API down / no network): local mode.
// submit/finish await `apiProbe` so a fast first pin can't race the probe.
type ApiConnState = "probing" | "ready" | "disconnected" | "offline";
const apiState = ref<ApiConnState>("probing");
const apiReady = computed(() => apiState.value === "ready");

// ── Live URL tracking ─────────────────────────────────────────────────────
// The frozen `browserMeta.pageUrl` (captured at annotation start) is only the
// SEED. If the page is a SPA and navigates during annotation (a side panel
// pushing /appointments/abc into history, a route swap, even just a hash
// change), pins created after the change MUST attach to the new URL — and the
// overlay should re-fetch the new page's pins, not keep showing the old set.
// The single source of truth becomes `livePageUrl`; refs/writes use it.
// Stored CANONICAL (via normalizeUrl from @pinlay/shared) so adding/removing
// tracking params (utm_*, fbclid…) or fragment changes don't fire spurious
// refetches — only meaningful navigation does.
const livePageUrl = ref<string>(
  normalizeUrl(props.browserMeta.pageUrl || location.href),
);

const apiProbe: Promise<void> = (async () => {
  if (!livePageUrl.value) {
    apiState.value = "offline";
    return;
  }
  try {
    const pins = await api.getPagePins(livePageUrl.value);
    apiState.value = "ready";
    existingPins.value = pins
      .map((row, i) => rowToExistingPin(row, i + 1))
      .filter((p): p is ExistingPin => p !== null);
    // Keep the FAB/popup's "View pins (N)" affordance in sync — the count
    // may have drifted since the content-script init probe (Roadmap 2.1).
    state.setViewablePinCount(existingPins.value.length);
  } catch (e) {
    // 401 = authenticated request rejected → not connected. Anything without a
    // status (network error, orphaned SW) = the backend is unreachable.
    const status = e instanceof ApiError ? e.status : undefined;
    apiState.value = status === 401 ? "disconnected" : "offline";
    console.warn(
      `[pinlay] API ${apiState.value} — pins will save locally:`,
      (e as Error).message,
    );
    return;
  }
  // Members are optional context (the assignee picker) — a failure here must
  // not knock us out of API mode.
  try {
    members.value = await api.getWorkspaceMembers();
  } catch {
    /* assignee list stays empty */
  }
})();

// Open the dashboard's connect page (same handoff the popup uses). The web app
// posts the session token back, the content script stores it; the user can
// re-enter annotation to pick up API mode.
function openConnect() {
  void safeSendMessage({
    type: "OPEN_TAB",
    url: `${WEB_APP_URL}/connect-extension`,
  });
}

watch(
  () =>
    existingPins.value.length +
    localPins.value.filter((p) => p.state === "submitted").length,
  (count) => state.setPinCount(count),
  { immediate: true },
);

watch(pinListRows, (rows) => state.setPinRows(rows), { immediate: true });

watch(
  () => state.jumpRequested.value,
  (v, prev) => {
    if (v !== prev) void onJumpToPin(state.jumpTargetId.value);
  },
);

// ── Live URL tracking listeners ──────────────────────────────────────────
// pushState / replaceState don't fire events natively. We monkey-patch them
// to dispatch a synthetic `pinlay:location` so we react to SPA navigation
// the same way we react to popstate/hashchange. Originals are restored on
// unmount so we don't leak across re-mounts.
const _origPushState = history.pushState.bind(history);
const _origReplaceState = history.replaceState.bind(history);
// SPA routers (Nuxt/Vue Router/React Router) typically capture
// `history.pushState` at page load — BEFORE our monkey-patch installs — so
// their navigations call the saved original and bypass us entirely, and
// `popstate`/`hashchange` don't fire on pushState. A cheap normalized-URL poll
// is the reliable catch-all: without it, pins from the old route linger as
// "element not found" and new pins save under the stale URL.
let locationPoll: ReturnType<typeof setInterval> | undefined;

function onLocationMaybeChanged() {
  // Compare normalized → normalized so `?utm_source=foo` and `?utm_source=bar`
  // on the same logical page don't count as navigation. This is the whole
  // point of putting normalizeUrl on the client: avoid pointless refetches.
  const next = normalizeUrl(location.href);
  if (next === livePageUrl.value) return;
  livePageUrl.value = next;
  // Re-fetch this URL's pins so the overlay reflects the new page. Skip when
  // a composer is open — yanking the surface mid-edit would lose the draft.
  if (!composingPin.value) void refetchPagePins();
}

async function refetchPagePins() {
  if (apiState.value !== "ready") return;
  try {
    const pins = await api.getPagePins(livePageUrl.value);
    existingPins.value = pins
      .map((row, i) => rowToExistingPin(row, i + 1))
      .filter((p): p is ExistingPin => p !== null);
  } catch {
    /* leave the previous list; livePageUrl already updated for next write */
  }
}

function patchHistoryForLocationEvents() {
  history.pushState = function (...args) {
    const r = _origPushState(...args);
    onLocationMaybeChanged();
    return r;
  };
  history.replaceState = function (...args) {
    const r = _origReplaceState(...args);
    onLocationMaybeChanged();
    return r;
  };
}

onMounted(() => {
  window.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("popstate", onLocationMaybeChanged);
  window.addEventListener("hashchange", onLocationMaybeChanged);
  patchHistoryForLocationEvents();
  // Catch-all for SPA navigations the patch/events miss (see note above).
  locationPoll = setInterval(onLocationMaybeChanged, 500);
});

onBeforeUnmount(() => {
  // Defensive: if the overlay is ever unmounted mid-session, make sure the
  // FAB returns to idle. In the normal passive-overlay lifecycle this is a
  // no-op (active was already cleared by exitPlaceMode).
  state.setActive(false);
  window.removeEventListener("scroll", onViewportChange, true);
  window.removeEventListener("resize", onViewportChange);
  window.removeEventListener("popstate", onLocationMaybeChanged);
  window.removeEventListener("hashchange", onLocationMaybeChanged);
  if (locationPoll) clearInterval(locationPoll);
  // Restore originals — leaving patched globals after unmount would corrupt
  // the page's history API for the host site.
  history.pushState = _origPushState;
  history.replaceState = _origReplaceState;
});

function rowToExistingPin(row: AnnotationPinRow, index: number): ExistingPin | null {
  const anchor = row.anchor as unknown as PinAnchor;
  if (!anchor?.rect) return null;

  const pageX = anchor.rect.x + anchor.offset.xPct * anchor.rect.w + anchor.scroll.x;
  const pageY = anchor.rect.y + anchor.offset.yPct * anchor.rect.h + anchor.scroll.y;

  return {
    kind: "existing",
    id: row.id,
    issueId: row.issueId,
    index,
    pageX,
    pageY,
    anchor,
    severity: (row.severity ?? "medium") as Severity,
    status: (row.status ?? "open") as Status,
    state: "submitted",
    comment: row.comment,
    issueType: row.issueType ?? null,
  };
}

// ── Hover highlight (PLACE only) ────────────────────────────────────────────
const hover = ref<{ x: number; y: number; w: number; h: number } | null>(null);
const overlayHostSelector = "pinlay-annotation";

function isOverlayChrome(el: Element | null): boolean {
  if (!el) return false;
  const hostEl = document.querySelector(overlayHostSelector) as HTMLElement | null;
  const launcherEl = document.querySelector("pinlay-launcher") as HTMLElement | null;
  return (
    (!!hostEl && hostEl.contains(el)) || (!!launcherEl && launcherEl.contains(el))
  );
}

function elementAt(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (isOverlayChrome(el)) continue;
    if (el === document.body || el === document.documentElement) continue;
    return meaningfulTarget(el);
  }
  return null;
}

const MIN_TARGET_PX = 12;
function meaningfulTarget(el: Element): Element {
  let cur: Element = el;
  for (let i = 0; i < 4; i++) {
    const parent = cur.parentElement;
    if (!parent || parent === document.body) break;

    const r = cur.getBoundingClientRect();
    const tooSmall = r.width < MIN_TARGET_PX || r.height < MIN_TARGET_PX;

    const style = window.getComputedStyle(cur);
    const isInline = style.display.startsWith("inline");

    if (tooSmall || isInline) {
      const pr = parent.getBoundingClientRect();
      const parentTooBig =
        pr.width * pr.height > window.innerWidth * window.innerHeight * 0.6;
      if (parentTooBig) break;
      cur = parent;
      continue;
    }
    break;
  }
  return cur;
}

let hoverRafPending = false;
let lastMove: { x: number; y: number } | null = null;
function onPlaceMove(e: MouseEvent) {
  if (composingPin.value) return;
  lastMove = { x: e.clientX, y: e.clientY };
  if (hoverRafPending) return;
  hoverRafPending = true;
  requestAnimationFrame(() => {
    hoverRafPending = false;
    if (!lastMove) return;
    const el = elementAt(lastMove.x, lastMove.y);
    if (!el) {
      hover.value = null;
      return;
    }
    const r = el.getBoundingClientRect();
    hover.value = { x: r.left, y: r.top, w: r.width, h: r.height };
  });
}

async function onPlaceClick(e: MouseEvent) {
  if (composingPin.value) return;
  const el = elementAt(e.clientX, e.clientY);
  if (!el) return;

  const anchor = describeAnchor(el, e.clientX, e.clientY);

  if (reanchoringPinId.value) {
    void applyReanchor(reanchoringPinId.value, anchor, e);
    return;
  }

  const id = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newIndex = visiblePins.value.length + 1;
  const pin: DraftPin = {
    kind: "draft",
    id,
    index: newIndex,
    pageX: e.clientX + window.scrollX,
    pageY: e.clientY + window.scrollY,
    anchor,
    draft: {
      comment: "",
      // Roadmap 4.2 — defaults persist across pins within a sitting so a
      // user filing five Copy fixes doesn't have to pick the template each
      // time. First pin uses the system default (medium / visual).
      severity: lastTemplateDefaults.value.severity,
      issueType: lastTemplateDefaults.value.issueType,
      images: [],
      assigneeId: null,
      labels: [],
    },
    state: "draft",
    submitting: false,
  };
  localPins.value.push(pin);
  composingPinId.value = id;
  hover.value = null;
}

// Last template (severity + type) used in this sitting. Persists for the
// lifetime of the overlay so a streak of pins of the same kind don't each
// need a template click. Reset only on remount.
const lastTemplateDefaults = ref<{ severity: Severity; issueType: PinType }>({
  severity: "medium",
  issueType: "visual",
});

// ── Re-anchor a stale pin ────────────────────────────────────────────────────
const reanchoringPinId = ref<string | null>(null);

function startReanchor(pinId: string) {
  reanchoringPinId.value = pinId;
  viewingPinId.value = null;
  mode.value = "place";
  state.setMode("place");
}

async function persistReanchor(
  pin: ExistingPin,
  anchor: PinAnchor,
  clientX: number,
  clientY: number,
) {
  pin.anchor = anchor;
  pin.pageX = clientX + window.scrollX;
  pin.pageY = clientY + window.scrollY;

  try {
    await api.updatePin(pin.id, {
      anchor: anchor as unknown as Record<string, unknown>,
      offsetX: anchor.offset.xPct,
      offsetY: anchor.offset.yPct,
    });
  } catch (err) {
    console.warn("[pinlay] failed to persist re-anchor:", (err as Error).message);
  }
}

async function applyReanchor(pinId: string, anchor: PinAnchor, e: MouseEvent) {
  const pin = existingPins.value.find((p) => p.id === pinId);
  reanchoringPinId.value = null;
  exitPlaceMode();
  if (!pin) return;
  await persistReanchor(pin, anchor, e.clientX, e.clientY);
}

// Roadmap 1.3: accept the fuzzy suggestion — re-anchor the viewed pin to the
// proposed element (keeping the pin's original click offset) without entering
// manual PLACE mode.
async function acceptSuggestion() {
  const pin = viewingPin.value;
  const s = reanchorSuggestion.value;
  if (!pin || !s) return;
  const r = s.el.getBoundingClientRect();
  const clientX = r.left + pin.anchor.offset.xPct * r.width;
  const clientY = r.top + pin.anchor.offset.yPct * r.height;
  const anchor = describeAnchor(s.el, clientX, clientY);
  await persistReanchor(pin, anchor, clientX, clientY);
}

// ── Pin click handlers (VIEW) ───────────────────────────────────────────────
function openPin(pinId: string) {
  const existing = existingPins.value.find((p) => p.id === pinId);
  if (existing) {
    viewingPinId.value = pinId;
    return;
  }
  const local = localPins.value.find((p) => p.id === pinId);
  if (local && local.state === "draft" && !local.submitting) {
    composingPinId.value = pinId;
  }
}

// ── Inline status change ─────────────────────────────────────────────────────
const statusUpdatingId = ref<string | null>(null);

async function onChangeStatus(pinId: string, status: Status) {
  const pin = existingPins.value.find((p) => p.id === pinId);
  if (!pin || pin.status === status) return;

  statusUpdatingId.value = pinId;
  const prev = pin.status;
  pin.status = status;
  try {
    await api.updatePin(pinId, { status });
  } catch (e) {
    pin.status = prev;
    console.warn("[pinlay] failed to update pin status:", (e as Error).message);
  } finally {
    statusUpdatingId.value = null;
  }
}

// ── Composer events ─────────────────────────────────────────────────────────
async function onComposerSubmit(draft: PinDraft) {
  const pin = composingPin.value;
  if (!pin) return;
  pin.draft = draft;
  pin.submitting = true;
  pin.error = undefined;

  // Roadmap 4.2 — remember the template (severity + type) for the next pin
  // in this sitting. Set BEFORE the await so it sticks even if submit fails.
  lastTemplateDefaults.value = {
    severity: draft.severity,
    issueType: draft.issueType,
  };

  // Wait for the startup probe so a fast first pin doesn't race into local
  // mode before we know the API is up.
  await apiProbe;

  // Local-only fallback: only when the API is unreachable. Promotes the draft
  // to an in-memory pin without hitting the network (offline / API down).
  if (!apiReady.value) {
    const attachments = await Promise.all(
      (draft.images ?? []).map(fileToAttachment),
    );
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    composingPinId.value = null;
    localPins.value = localPins.value.filter((p) => p.id !== pin.id);
    existingPins.value.push({
      kind: "existing",
      id: localId,
      issueId: null,
      index: existingPins.value.length + 1,
      pageX: pin.pageX,
      pageY: pin.pageY,
      anchor: pin.anchor,
      severity: draft.severity,
      status: "open",
      state: "submitted",
      comment: draft.comment,
      issueType: draft.issueType,
      attachments: attachments.filter((a): a is PinAttachment => a !== null),
      author: { name: "You", avatarHue: 264 },
      createdAt: new Date().toISOString(),
    });
    reindexPins();
    // Sticky place mode: don't auto-open the new pin's detail — the user is
    // mid-flow and the next click should drop another pin.
    closeComposerStayPlace();
    return;
  }

  try {
    const res = await api.createPin({
      sessionId: sessionId.value ?? undefined,
      issueId: issueId.value ?? undefined,
      // LIVE URL — captured at submit time, not annotation start. Ensures a
      // pin dropped after an SPA route push lands on the right page.
      pageUrl: livePageUrl.value,
      anchor: pin.anchor as unknown as Record<string, unknown>,
      offsetX: pin.anchor.offset.xPct,
      offsetY: pin.anchor.offset.yPct,
      comment: draft.comment,
      severity: draft.severity,
      issueType: draft.issueType,
      assigneeId: draft.assigneeId ?? undefined,
      labels: draft.labels.length ? draft.labels : undefined,
    });
    sessionId.value = res.sessionId;
    issueId.value = res.issueId;

    // Close the composer + show the persisted pin AS SOON AS createPin returns.
    // Attachments upload in the background in parallel; making the user wait on
    // serial N×RTT uploads just to dismiss the composer is the visible delay.
    if (draft.images && draft.images.length > 0) {
      void Promise.all(
        draft.images.map((img) =>
          api
            .uploadAttachment({
              blob: img,
              filename: img.name || `image-${Date.now()}.png`,
              type: "screenshot",
              issueId: res.issueId,
            })
            .catch((err) => {
              console.warn(
                "[pinlay] background attachment upload failed:",
                (err as Error).message,
              );
              return null;
            }),
        ),
      );
    }

    composingPinId.value = null;
    localPins.value = localPins.value.filter((p) => p.id !== pin.id);
    existingPins.value.push({
      kind: "existing",
      id: res.pin.id,
      issueId: res.issueId,
      index: existingPins.value.length + 1,
      pageX: pin.pageX,
      pageY: pin.pageY,
      anchor: pin.anchor,
      severity: draft.severity,
      status: "open",
      state: "submitted",
      comment: draft.comment,
      issueType: draft.issueType,
    });
    reindexPins();

    // Sticky place mode (same rationale as the local-only branch above).
    closeComposerStayPlace();
  } catch (e) {
    pin.error =
      (e as Error).message || "Could not submit pin. Please try again.";
    pin.submitting = false;
  }
}

// Read a File into a PinAttachment shape (used by the local-only submit
// path so the detail view can render the screenshot card with dimensions +
// size). Failures return null so a corrupt file doesn't kill the whole pin.
async function fileToAttachment(file: File): Promise<PinAttachment | null> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const dimensions = await new Promise<{ w: number; h: number } | undefined>(
      (resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(undefined);
        img.src = dataUrl;
      },
    );
    return {
      name: file.name,
      mime: file.type || "application/octet-stream",
      dataUrl,
      size: file.size,
      dimensions,
    };
  } catch {
    return null;
  }
}

function reindexPins() {
  existingPins.value.forEach((p, i) => {
    p.index = i + 1;
  });
  localPins.value.forEach((p, i) => {
    p.index = existingPins.value.length + i + 1;
  });
}

function onComposerCancel() {
  const pin = composingPin.value;
  if (!pin) return;
  if (pin.state === "draft" && !pin.submitting) {
    localPins.value = localPins.value.filter((p) => p.id !== pin.id);
    localPins.value.forEach((p, i) => {
      p.index = existingPins.value.length + i + 1;
    });
  }
  // Sticky place mode: cancelling the composer drops the draft but keeps the
  // user in place mode. A second Escape (or the FAB) exits placing entirely.
  closeComposerStayPlace();
}

// ── Done → finish review ─────────────────────────────────────────────────────
const finishing = ref(false);
const reviewTitle = ref("");
const finishBusy = ref(false);

const sessionPinCount = computed(
  () =>
    existingPins.value.filter((p) => p.issueId === issueId.value).length,
);
const priorPinsCount = computed(
  () => existingPins.value.filter((p) => p.issueId !== issueId.value).length,
);

function onDone() {
  if (composingPin.value) onComposerCancel();

  // Show the title popover only when THIS sitting created at least one pin
  // (i.e. there's a session to name). With the developer-overlay change the
  // overlay may already be showing pins from previous sittings — we don't
  // want Done to prompt a review for those.
  if (sessionPinCount.value > 0) {
    reviewTitle.value = defaultReviewTitle();
    finishing.value = true;
    return;
  }
  // No new pins this sitting → just leave place mode. The overlay stays
  // mounted so any existing pins remain visible (Roadmap 2.1 — developer
  // overlay). FAB returns to idle via exitPlaceMode.
  exitPlaceMode();
}

function defaultReviewTitle(): string {
  let host = livePageUrl.value;
  try {
    host = new URL(livePageUrl.value).host;
  } catch {
    /* keep */
  }
  const n = sessionPinCount.value;
  return `Annotation review · ${host} · ${n} pin${n === 1 ? "" : "s"}`;
}

async function confirmFinish() {
  // Local-only mode: no sessionId, no persistence — just close cleanly so
  // the user sees the naming flow end-to-end. When the API lands the title
  // call below will run.
  if (sessionId.value) {
    finishBusy.value = true;
    try {
      await api.submitSession(
        sessionId.value,
        reviewTitle.value.trim() || defaultReviewTitle(),
      );
    } catch (e) {
      console.warn("[pinlay] failed to submit session:", (e as Error).message);
    } finally {
      finishBusy.value = false;
    }
  }
  finishing.value = false;
  // End the annotation session but DON'T unmount the overlay — the developer-
  // overlay view keeps showing pins on the page (Roadmap 2.1). Reset session
  // ids so the next pin drop opens a fresh session/issue server-side.
  sessionId.value = null;
  issueId.value = null;
  exitPlaceMode();
}

function cancelFinish() {
  finishing.value = false;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (finishing.value) {
    cancelFinish();
    return;
  }
  if (composingPin.value) {
    onComposerCancel();
    return;
  }
  if (viewingPinId.value) {
    viewingPinId.value = null;
    return;
  }
  if (mode.value === "place") {
    exitPlaceMode();
    return;
  }
  onDone();
}

onMounted(() => document.addEventListener("keydown", onKeyDown, true));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeyDown, true));
</script>
