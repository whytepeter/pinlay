<!--
  RegionSelector
  ──────────────
  Full-page crosshair overlay. The user drags a rectangle over the area to
  capture. Lives in its own shadow root so it covers the page (and any other
  pinlay UI) without leaking styles.

  Dimming trick:
    Before a selection exists → flat rgba(0,0,0,0.45) overlay dims the page.
    During / after drag       → overlay goes transparent and the selection's
                                 `outline: 9999px solid …` paints a dark mask
                                 OUTSIDE the box only. Inside the selection is
                                 100% clear, so the user can see what they're
                                 capturing.

  Emits:
    selected(bounds: RegionBounds)  — confirmed region in CSS pixels
    cancel()                        — Esc pressed or selector dismissed
-->
<template>
  <div
    ref="overlay"
    class="fixed inset-0 z-[2147483647] cursor-crosshair select-none outline-none pointer-events-auto transition-colors duration-100"
    :style="{ background: box ? 'transparent' : 'rgba(0,0,0,0.45)' }"
    tabindex="-1"
    @mousedown.prevent="onMousedown"
    @mousemove="onMousemove"
    @mouseup="onMouseup"
    @keydown.esc.prevent="emit('cancel')"
  >
    <!-- Selection box — outline-mask dims everything OUTSIDE the selection. -->
    <div
      v-if="box"
      class="absolute box-border"
      :style="{
        left: box.x + 'px',
        top: box.y + 'px',
        width: box.w + 'px',
        height: box.h + 'px',
        outline: '9999px solid rgba(0,0,0,0.62)',
        border: '2px solid var(--primary)',
      }"
    >
      <!-- Corner handles -->
      <span
        class="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-sm border-2 bg-card"
        :style="{ borderColor: 'var(--primary)' }"
      />
      <span
        class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-sm border-2 bg-card"
        :style="{ borderColor: 'var(--primary)' }"
      />
      <span
        class="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-sm border-2 bg-card"
        :style="{ borderColor: 'var(--primary)' }"
      />
      <span
        class="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-sm border-2 bg-card"
        :style="{ borderColor: 'var(--primary)' }"
      />

      <!-- Dimensions badge -->
      <span
        class="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold leading-none tracking-wide text-white"
        style="bottom: calc(100% + 8px); background: rgba(0, 0, 0, 0.78)"
      >
        {{ Math.round(box.w) }} × {{ Math.round(box.h) }}
      </span>
    </div>

    <!-- Hint pill (before dragging) — mirrors the mockup. -->
    <div
      v-else
      class="pointer-events-none absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card px-3 py-2 text-[13px] font-medium text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.25)] ring-1 ring-border"
    >
      <svg
        class="h-4 w-4 text-primary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
        />
        <circle cx="12" cy="13" r="3" />
      </svg>
      <span>Drag to capture a region</span>
      <kbd
        class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
        >Esc</kbd
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

export interface RegionBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const emit = defineEmits<{
  selected: [bounds: RegionBounds];
  cancel: [];
}>();

type DragState = "idle" | "dragging";

const overlay = ref<HTMLDivElement | null>(null);
const state = ref<DragState>("idle");
const origin = ref<{ x: number; y: number } | null>(null);
const box = ref<RegionBounds | null>(null);

onMounted(() => overlay.value?.focus());

function normalise(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): RegionBounds {
  return {
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    w: Math.abs(bx - ax),
    h: Math.abs(by - ay),
  };
}

function onMousedown(e: MouseEvent) {
  if (e.button !== 0) return;
  state.value = "dragging";
  origin.value = { x: e.clientX, y: e.clientY };
  box.value = null;
}

function onMousemove(e: MouseEvent) {
  if (state.value !== "dragging" || !origin.value) return;
  box.value = normalise(origin.value.x, origin.value.y, e.clientX, e.clientY);
}

function onMouseup(e: MouseEvent) {
  if (state.value !== "dragging" || !origin.value) return;
  const final = normalise(origin.value.x, origin.value.y, e.clientX, e.clientY);
  state.value = "idle";
  origin.value = null;
  if (final.w < 10 || final.h < 10) {
    box.value = null;
    return;
  }
  emit("selected", final);
}
</script>
