<!--
  MarkupView
  ──────────
  Top-level screenshot markup surface. Mounted in its own shadow root
  (`pinlay-markup`) after the user finishes a region capture.

  Layout:
    ┌──────────────────────────────────────────────────────────┐
    │                                                          │
    │             ┌──────────────────────────────┐             │
    │             │      cropped screenshot      │             │
    │             │      (MarkupCanvas)          │             │
    │             └──────────────────────────────┘             │
    │                                                          │
    │              [toolbar pill]  Cancel  [✓ Attach]          │
    │                                                          │
    └──────────────────────────────────────────────────────────┘

  Emits:
    attach(dataUrl)  — user clicked Attach; the dataUrl is the flattened PNG
    cancel()         — user clicked Cancel or pressed Esc
-->
<template>
  <div
    class="fixed inset-0 z-[2147483647] flex flex-col"
    style="background: rgba(0, 0, 0, 0.72)"
    @keydown.esc.prevent="onCancel"
    tabindex="-1"
    ref="rootEl"
  >
    <!-- Canvas area fills available space, toolbar sits below it. -->
    <div class="relative min-h-0 flex-1">
      <MarkupCanvas
        ref="canvasRef"
        :screenshot-data-url="screenshotDataUrl"
        :tool="tool"
        :color="color"
        @history-change="onHistoryChange"
        @selection-change="onSelectionChange"
      />
    </div>

    <!-- Toolbar + action row. Wraps on narrow viewports so the toolbar pill
         and the Cancel/Attach pill don't overlap. -->
    <div class="absolute bottom-4 left-0 right-0 flex justify-center px-3">
      <div class="flex max-w-full flex-wrap items-center justify-center gap-2">
        <MarkupToolbar
          :tool="tool"
          :color="color"
          :can-undo="canUndo"
          :can-redo="canRedo"
          :has-selection="hasSelection"
          @update:tool="tool = $event"
          @update:color="color = $event"
          @undo="onUndo"
          @redo="onRedo"
          @delete="onDelete"
        />
        <div
          class="flex items-center gap-1.5 rounded-2xl border border-border bg-card/95 px-2 py-[7px] shadow-[0_8px_28px_rgba(0,0,0,0.15)] backdrop-blur-md"
        >
          <Button
            variant="ghost"
            size="sm"
            class="h-8 gap-1 px-2.5 text-[12px]"
            @click="onCancel"
            >Cancel</Button
          >
          <Button
            variant="default"
            size="sm"
            class="h-8 gap-1.5 px-3 text-[12px]"
            @click="onAttach"
          >
            <Icon name="check" :size="12" :stroke-width="2.25" />
            Attach
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Button, Icon } from "@pinlay/design";
import MarkupCanvas from "./MarkupCanvas.vue";
import MarkupToolbar from "./MarkupToolbar.vue";
import type { DrawTool } from "./types";

defineProps<{ screenshotDataUrl: string }>();

const emit = defineEmits<{
  attach: [dataUrl: string];
  cancel: [];
}>();

const rootEl = ref<HTMLDivElement | null>(null);
const canvasRef = ref<{
  exportPng: () => string;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
} | null>(null);

const tool = ref<DrawTool>("grab");
const color = ref<string>("#7c3aed");
const canUndo = ref(false);
const canRedo = ref(false);
const hasSelection = ref(false);

function onHistoryChange(u: boolean, r: boolean) {
  canUndo.value = u;
  canRedo.value = r;
}
function onSelectionChange(v: boolean) {
  hasSelection.value = v;
}
function onUndo() {
  canvasRef.value?.undo();
}
function onRedo() {
  canvasRef.value?.redo();
}
function onDelete() {
  canvasRef.value?.deleteSelected();
}

function onAttach() {
  const url = canvasRef.value?.exportPng();
  if (url) emit("attach", url);
  else emit("cancel");
}
function onCancel() {
  emit("cancel");
}

onMounted(() => rootEl.value?.focus());
</script>
