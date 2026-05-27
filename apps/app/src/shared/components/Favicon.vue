<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{ label: string; hue?: number; size?: number }>(),
  { hue: 262, size: 16 },
);

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(7, props.size * 0.5)}px`,
  background: `linear-gradient(135deg, oklch(0.6 0.16 ${props.hue}), oklch(0.4 0.13 ${props.hue}))`,
}));
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded font-mono font-bold text-white"
    :style="style"
    >{{ label }}</span
  >
</template>
