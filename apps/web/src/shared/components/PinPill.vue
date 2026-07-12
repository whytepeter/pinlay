<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ n: number; sm?: boolean }>();

const label = computed(() => `#${String(props.n).padStart(2, "0")}`);
</script>

<template>
  <span
    class="mono inline-flex items-center justify-center rounded-full bg-primary/12 font-semibold tracking-[0.02em] text-primary"
    :class="
      sm ? 'h-[18px] px-2 text-[10.5px]' : 'h-[22px] px-2.5 text-[11.5px]'
    "
    >{{ label }}</span
  >
</template>
