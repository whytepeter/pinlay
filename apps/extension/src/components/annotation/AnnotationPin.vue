<!--
  AnnotationPin
  ─────────────
  Numbered marker dropped at the click point. Stays on the page while the
  user works on another pin, outlives the composer.

  Colour rule:
    • Pin colour is ALWAYS derived from severity (low/medium/high/critical).
      Severity is the at-a-glance signal — "how bad is this?" — and it never
      changes after the pin is filed, so the marker stays visually stable as
      the issue moves through statuses. Status is surfaced inside the detail
      popover (header status chip).

    • Resolved pins fade out via opacity to acknowledge "this is done"
      without losing the severity signal.

  Positioned ABSOLUTELY in VIEWPORT coordinates (the parent overlay is
  `position: fixed`); the parent recomputes positions on scroll/resize.
-->
<template>
  <button
    type="button"
    :class="[
      'pointer-events-auto absolute z-[2147483645] -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-2 transition-transform hover:scale-110',
      pinBg,
      resolved && 'opacity-55',
      stale
        ? 'ring-status-stale opacity-75 outline outline-2 outline-dashed outline-status-stale outline-offset-1'
        : 'ring-white',
    ]"
    :style="{ left: pageX + 'px', top: pageY + 'px' }"
    :aria-label="
      stale
        ? `Pin ${index} (element not found)`
        : resolved
          ? `Open pin ${index} (resolved)`
          : `Open pin ${index}`
    "
    @click.stop="$emit('open')"
  >
    {{ index }}
    <!-- Resolved checkmark badge — small overlay so severity colour still
         reads clearly underneath. -->
    <span
      v-if="resolved && !stale"
      class="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-status-resolved ring-1 ring-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-2 w-2 text-white"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
    <span
      v-if="stale"
      class="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-status-stale ring-1 ring-white"
    >
      <span class="h-1 w-1 rounded-full bg-card" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Severity, Status } from "@pinlay/shared";

const props = defineProps<{
  index: number;
  pageX: number;
  pageY: number;
  severity: Severity;
  /** "draft" = composer still open; "submitted" = pin persisted. */
  state: "draft" | "submitted";
  /** Pin status — drives colour for submitted pins. */
  status?: Status;
  /** True when the anchored element couldn't be re-resolved on this page. */
  stale?: boolean;
}>();

defineEmits<{ open: [] }>();

const SEVERITY_BG: Record<Severity, string> = {
  low: "bg-sev-low",
  medium: "bg-sev-medium",
  high: "bg-sev-high",
  critical: "bg-sev-critical",
};

// Severity is the only signal that drives pin colour — it's stable for the
// life of the pin and answers "how bad is this?" at a glance. Status is
// surfaced via the resolved-checkmark overlay below + the detail popover's
// status dropdown.
const pinBg = computed(() => SEVERITY_BG[props.severity]);
const resolved = computed(() => props.status === "resolved");
</script>
