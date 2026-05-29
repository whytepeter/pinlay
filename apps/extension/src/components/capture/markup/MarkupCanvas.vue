<!--
  MarkupCanvas
  ────────────
  Renders the screenshot + replays the shape list on top via useMarkupCanvas.
  Wires drawing events; exposes exportPng / undo / redo / deleteSelected on
  the component instance.

  Layout:
    outer      — fills parent, padding around canvas (reserves toolbar space)
    inner      — sized exactly to display dimensions of the canvas (1:1 aspect)
    canvas     — fills inner, rounded + shadow
    text input — absolute HTML <textarea> shown when text-tool clicks
-->
<template>
  <div
    ref="outer"
    class="flex h-full w-full items-center justify-center px-4 pt-6 pb-[140px] sm:px-8 sm:pt-8"
  >
    <div
      ref="inner"
      class="relative flex-shrink-0"
      :style="{ width: displayW, height: displayH }"
    >
      <div
        class="h-full w-full overflow-hidden rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.07)]"
      >
        <canvas
          ref="canvas"
          class="block h-full w-full"
          :style="{ cursor: cursorForTool }"
          @mousedown.prevent="onMousedown"
          @mousemove="onMousemove"
          @mouseup="onMouseup"
          @mouseleave="onMouseleave"
        />
      </div>

      <!-- Text-tool overlay input — positioned at the canvas-space click. -->
      <div
        v-if="pendingText"
        class="absolute z-20"
        :style="{
          left: `${pendingText.canvasX * scale}px`,
          top: `${pendingText.canvasY * scale}px`,
        }"
      >
        <textarea
          ref="textArea"
          v-model="textValue"
          rows="1"
          class="resize-none overflow-hidden rounded border border-primary bg-card/95 px-2 py-1 font-semibold leading-tight outline-none shadow-[0_4px_16px_color-mix(in_oklab,var(--primary)_25%,transparent)] backdrop-blur-sm"
          :style="{
            color,
            fontSize: `${textFontPx}px`,
            minWidth: '120px',
            minHeight: `${textFontPx * 1.4}px`,
          }"
          placeholder="Type…"
          @keydown.enter.exact.prevent="onTextSubmit"
          @keydown.escape.prevent="onTextCancel"
          @blur="onTextSubmit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  toRef,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import { useMarkupCanvas } from "./useMarkupCanvas";
import type { DrawTool } from "./types";

const props = defineProps<{
  screenshotDataUrl: string;
  tool: DrawTool;
  color: string;
}>();

const emit = defineEmits<{
  "history-change": [canUndo: boolean, canRedo: boolean];
  "selection-change": [hasSelection: boolean];
}>();

const outer = ref<HTMLDivElement | null>(null);
const inner = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const textArea = ref<HTMLTextAreaElement | null>(null);
const outerW = ref(0);
const outerH = ref(0);

let ro: ResizeObserver | null = null;
onMounted(() => {
  const el = outer.value;
  if (!el) return;
  ro = new ResizeObserver(([entry]) => {
    outerW.value = entry.contentRect.width;
    outerH.value = entry.contentRect.height;
  });
  ro.observe(el);
});
onUnmounted(() => ro?.disconnect());

const {
  bitmapW,
  bitmapH,
  canUndo,
  canRedo,
  hasSelection,
  cursorForTool,
  pendingText,
  onMousedown,
  onMousemove,
  onMouseup,
  onMouseleave,
  commitText,
  cancelText,
  deleteSelected,
  exportPng: _exportPng,
  undo,
  redo,
} = useMarkupCanvas({
  canvas,
  screenshotDataUrl: toRef(props, "screenshotDataUrl"),
  tool: toRef(props, "tool"),
  color: toRef(props, "color"),
});

watch([canUndo, canRedo], ([u, r]) => emit("history-change", u, r), {
  immediate: true,
});
watch(hasSelection, (v) => emit("selection-change", v), { immediate: true });

const scale = computed((): number => {
  if (!outerW.value || !bitmapW.value || !bitmapH.value) return 1;
  return Math.min(outerW.value / bitmapW.value, outerH.value / bitmapH.value);
});
const displayW = computed((): string => {
  if (!outerW.value || !bitmapW.value || !bitmapH.value) return "100%";
  return `${Math.floor(bitmapW.value * scale.value)}px`;
});
const displayH = computed((): string => {
  if (!outerH.value || !bitmapW.value || !bitmapH.value) return "100%";
  return `${Math.floor(bitmapH.value * scale.value)}px`;
});

const textValue = ref("");
const textFontPx = computed(() =>
  Math.max(14, Math.round(20 * scale.value * (window.devicePixelRatio || 1))),
);

watch(pendingText, async (pos) => {
  if (pos) {
    textValue.value = "";
    await nextTick();
    textArea.value?.focus();
  }
});

function onTextSubmit() {
  if (!pendingText.value) return;
  commitText(textValue.value);
  textValue.value = "";
}
function onTextCancel() {
  cancelText();
  textValue.value = "";
}

function exportPng() {
  return _exportPng(props.screenshotDataUrl);
}

defineExpose({ exportPng, undo, redo, deleteSelected });
</script>
