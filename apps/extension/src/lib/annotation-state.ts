/**
 * annotation-state
 * ────────────────
 * Module-level reactive state shared between the AnnotationOverlay (which
 * owns the actual flow) and the FloatingLauncher (which IS the toolbar while
 * annotation is active — start pinning, view pin count + list, exit).
 *
 * Both surfaces are Vue apps mounted in their own shadow roots, but they
 * import this same module, so the same `ref` instance is observed in both.
 *
 * Data flows:
 *   • Overlay → launcher : active / mode / pinCount / pinRows
 *   • Launcher → overlay : place / cancel / exit / jump intents (counter
 *     bumps that the overlay watches). Lighter than emit-up-prop-down
 *     across two Vue trees.
 */
import { computed, ref } from "vue";
import type { AnchorHealth } from "./anchor";

export type AnnotationOverlayMode = "view" | "place";

/** Linearised pin shape the launcher's pin-list sub-view renders. */
export interface PinListRow {
  id: string;
  index: number;
  title: string;
  statusLabel: string;
  dotBg: string;
  stale: boolean;
  /** Live resolve-health band (ok = green, fallback = yellow, dead = red). */
  health: AnchorHealth;
  /** URL the pin lives on (Roadmap 2.1 host grouping). Used by the FAB
   *  pin-list click handler to decide same-page vs cross-URL navigation. */
  pageUrl?: string;
}

const active = ref(false);
const mode = ref<AnnotationOverlayMode>("view");
const pinCount = ref(0);
const pinRows = ref<PinListRow[]>([]);
// Roadmap 2.1 — pins are HIDDEN by default. The user opts into the developer
// overlay via "View pins" (FAB + popup) when the page has pins to show.
//
//   `viewing`            — overlay is mounted right now (passive view or place)
//   `viewablePinCount`   — pins the API knows about for this URL; drives the
//                          "View pins (N)" affordance even before mount.
const viewing = ref(false);
const viewablePinCount = ref(0);

// Imperative bridge — launcher fires intents (counter bumps), overlay watches.
const placeRequested = ref(0);
const exitRequested = ref(0);
const cancelRequested = ref(0);
const jumpRequested = ref(0);
const jumpTargetId = ref<string>("");

function setActive(next: boolean) {
  active.value = next;
  if (!next) {
    mode.value = "view";
    pinCount.value = 0;
    pinRows.value = [];
  }
}

function setViewing(next: boolean) {
  viewing.value = next;
}
function setViewablePinCount(n: number) {
  viewablePinCount.value = Math.max(0, n);
}

function setMode(next: AnnotationOverlayMode) {
  mode.value = next;
}
function setPinCount(n: number) {
  pinCount.value = Math.max(0, n);
}
function setPinRows(rows: PinListRow[]) {
  pinRows.value = rows;
}

/** Launcher → overlay: enter PLACE mode. */
function requestPlace() {
  placeRequested.value++;
}
/** Launcher → overlay: cancel PLACE mode. */
function requestCancel() {
  cancelRequested.value++;
}
/** Launcher → overlay: exit annotation entirely. */
function requestExit() {
  exitRequested.value++;
}
/** Launcher → overlay: scroll to + open a specific pin. */
function requestJump(id: string) {
  jumpTargetId.value = id;
  jumpRequested.value++;
}

export function useAnnotationState() {
  return {
    active: computed(() => active.value),
    mode: computed(() => mode.value),
    pinCount: computed(() => pinCount.value),
    pinRows: computed(() => pinRows.value),
    viewing: computed(() => viewing.value),
    viewablePinCount: computed(() => viewablePinCount.value),
    placeRequested: computed(() => placeRequested.value),
    cancelRequested: computed(() => cancelRequested.value),
    exitRequested: computed(() => exitRequested.value),
    jumpRequested: computed(() => jumpRequested.value),
    jumpTargetId: computed(() => jumpTargetId.value),

    setActive,
    setMode,
    setPinCount,
    setPinRows,
    setViewing,
    setViewablePinCount,

    requestPlace,
    requestCancel,
    requestExit,
    requestJump,
  };
}
