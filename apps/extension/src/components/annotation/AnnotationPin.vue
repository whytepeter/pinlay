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
  <!-- Outer = positioned hit target. Owns the centering transform ONLY, so it
       never fights the inner span's hover / press / drop-in transforms. -->
  <button
    type="button"
    class="group pointer-events-auto absolute z-[2147483645] flex h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0"
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
    <!-- Inner = the glossy iOS pin. Severity colour + white ring + layered
         shadow (.pinlay-marker) + convex gloss + springy hover/press. -->
    <span
      :class="[
        'pinlay-marker relative flex h-full w-full items-center justify-center rounded-full text-[12px] font-semibold leading-none tabular-nums text-white transition-transform duration-150 ease-out [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] group-hover:scale-110 group-active:scale-90',
        pinBg,
        resolved && 'opacity-60',
        stale
          ? 'ring-2 ring-status-stale outline outline-2 outline-dashed outline-status-stale outline-offset-2'
          : 'ring-2 ring-white',
      ]"
    >
      <!-- Convex gloss: light sheen up top fading to a faint shade at the
           bottom, so the flat disc reads as a rounded iOS pin. -->
      <span
        class="pointer-events-none absolute inset-0 rounded-full"
        style="
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.42) 0%,
            rgba(255, 255, 255, 0.06) 46%,
            rgba(0, 0, 0, 0.1) 100%
          );
        "
      />
      <span class="relative">{{ index }}</span>

      <!-- Resolved checkmark badge — sits on the marker so severity colour
           still reads clearly underneath. -->
      <span
        v-if="resolved && !stale"
        class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-status-resolved shadow-sm ring-2 ring-white"
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
        class="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-status-stale ring-2 ring-white"
      >
        <span class="h-1 w-1 rounded-full bg-card" />
      </span>
      <!-- Yellow health band: re-found heuristically, may have moved. -->
      <span
        v-if="moved"
        class="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-sev-medium ring-2 ring-white"
        title="Re-found by content — this pin may have moved"
      >
        <span class="h-1 w-1 rounded-full bg-white" />
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Severity, Status } from "@pinlay/shared";
import type { AnchorHealth } from "../../lib/anchor";

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
  /** Resolve-health band from the live anchor lookup (drives the badge). */
  health?: AnchorHealth;
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

// Yellow "fallback" band — the pin was re-found heuristically (its structural
// locator broke), so it likely moved. Dead/stale has its own treatment, so
// only surface "moved" while the pin still resolves.
const moved = computed(() => props.health === "fallback" && !props.stale);
</script>
