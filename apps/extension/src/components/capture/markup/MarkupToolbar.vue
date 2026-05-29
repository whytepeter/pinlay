<!--
  MarkupToolbar
  ─────────────
  Floating pill toolbar below the screenshot. Adapted from devprobe-report's
  AnnotationToolbar with pinlay tokens.

  Layout:
    [color | select rect circle arrow text blur | undo redo (| delete)]
-->
<template>
  <div class="relative flex items-center" @click.stop>
    <!-- ── Color popover ──────────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-[opacity,transform] duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      leave-active-class="transition-[opacity,transform] duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="colorOpen"
        class="absolute bottom-[calc(100%+10px)] left-0 z-20 flex origin-bottom-left items-center gap-1.5 rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.15)] backdrop-blur-md"
      >
        <button
          v-for="c in PRESETS"
          :key="c"
          :title="c"
          :style="{ background: c }"
          :class="[
            'h-[22px] w-[22px] flex-shrink-0 rounded-full cursor-pointer border-0 transition-transform duration-100 hover:scale-110',
            c === '#ffffff' ? 'ring-1 ring-border' : '',
            color === c ? 'scale-110 ring-2 ring-offset-[2px] ring-primary' : '',
          ]"
          @click="selectColor(c)"
        />
        <button
          title="Custom color"
          class="relative flex h-[22px] w-[22px] flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border bg-transparent transition-transform duration-100 hover:scale-110"
          @click="colorInput?.click()"
        >
          <Icon name="plus" :size="11" :stroke-width="2.5" class="text-muted-foreground" />
        </button>
        <input
          ref="colorInput"
          type="color"
          :value="color"
          class="pointer-events-none absolute h-0 w-0 opacity-0"
          @input="onColorInput"
        />
      </div>
    </Transition>

    <!-- ── Main toolbar pill ──────────────────────────────────────────── -->
    <div
      class="flex select-none items-center gap-px rounded-2xl border border-border bg-card/95 px-2 py-[7px] shadow-[0_8px_28px_rgba(0,0,0,0.15)] backdrop-blur-md"
    >
      <!-- Color dot -->
      <button
        :title="'Color'"
        :class="[
          'flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 p-0 transition-colors duration-100',
          colorOpen ? 'bg-primary-soft' : 'bg-transparent hover:bg-muted',
        ]"
        @click="colorOpen = !colorOpen"
      >
        <span
          :class="[
            'h-[18px] w-[18px] rounded-full transition-shadow duration-100',
            colorOpen ? 'ring-2 ring-offset-2 ring-primary' : 'ring-1 ring-border',
          ]"
          :style="{ background: color }"
        />
      </button>

      <span class="mx-1.5 h-[18px] w-px flex-shrink-0 bg-border" />

      <!-- Tool buttons -->
      <button
        v-for="t in TOOLS"
        :key="t.id"
        :title="t.label"
        :class="[
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0 cursor-pointer transition-colors duration-100',
          tool === t.id
            ? 'bg-primary-soft text-primary'
            : 'bg-transparent text-foreground/70 hover:bg-muted hover:text-foreground',
        ]"
        @click="emit('update:tool', t.id)"
      >
        <Icon
          :name="t.icon"
          :size="16"
          :stroke-width="tool === t.id ? 2.25 : 1.75"
        />
      </button>

      <span class="mx-1.5 h-[18px] w-px flex-shrink-0 bg-border" />

      <button
        title="Undo (⌘Z)"
        :disabled="!canUndo"
        :class="[
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0 transition-colors duration-100',
          canUndo
            ? 'cursor-pointer bg-transparent text-foreground/70 hover:bg-muted hover:text-foreground'
            : 'cursor-not-allowed bg-transparent text-foreground/70 opacity-25',
        ]"
        @click="emit('undo')"
      >
        <Icon name="undo-2" :size="16" :stroke-width="1.75" />
      </button>

      <button
        title="Redo (⌘⇧Z)"
        :disabled="!canRedo"
        :class="[
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-0 p-0 transition-colors duration-100',
          canRedo
            ? 'cursor-pointer bg-transparent text-foreground/70 hover:bg-muted hover:text-foreground'
            : 'cursor-not-allowed bg-transparent text-foreground/70 opacity-25',
        ]"
        @click="emit('redo')"
      >
        <Icon name="redo-2" :size="16" :stroke-width="1.75" />
      </button>

      <template v-if="hasSelection">
        <span class="mx-1.5 h-[18px] w-px flex-shrink-0 bg-border" />
        <button
          title="Delete (⌫)"
          class="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent p-0 text-destructive transition-colors duration-100 hover:bg-destructive/10"
          @click="emit('delete')"
        >
          <Icon name="trash-2" :size="16" :stroke-width="1.9" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Icon } from "@pinlay/design";
import type { DrawTool } from "./types";

defineProps<{
  tool: DrawTool;
  color: string;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}>();

const emit = defineEmits<{
  "update:tool": [t: DrawTool];
  "update:color": [c: string];
  undo: [];
  redo: [];
  delete: [];
}>();

const colorOpen = ref(false);
const colorInput = ref<HTMLInputElement | null>(null);

const PRESETS = [
  "#7c3aed",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#000000",
  "#ffffff",
];

function selectColor(c: string) {
  emit("update:color", c);
  colorOpen.value = false;
}
function onColorInput(e: Event) {
  emit("update:color", (e.target as HTMLInputElement).value);
  colorOpen.value = false;
}

function onDocClick() {
  colorOpen.value = false;
}
onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));

const TOOLS: { id: DrawTool; label: string; icon: string }[] = [
  { id: "grab", label: "Select", icon: "mouse-pointer-2" },
  { id: "rect", label: "Rectangle", icon: "square" },
  { id: "circle", label: "Ellipse", icon: "circle" },
  { id: "arrow", label: "Arrow", icon: "arrow-up-right" },
  { id: "text", label: "Text", icon: "type" },
  { id: "blur", label: "Blur", icon: "eye-off" },
];
</script>
