<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ n: number; sm?: boolean }>();

const label = computed(() => `#${String(props.n).padStart(2, "0")}`);
</script>

<template>
  <span
    class="mono inline-flex items-center justify-center rounded border border-[color-mix(in_oklab,var(--primary)_30%,transparent)] bg-primary-soft font-semibold tracking-[0.02em] text-[color-mix(in_oklab,var(--primary)_50%,#000)] dark:text-[color-mix(in_oklab,var(--primary)_90%,#000)]"
    :class="
      sm ? 'h-[18px] px-1.5 text-[10.5px]' : 'h-[22px] px-2 text-[11.5px]'
    "
    >{{ label }}</span
  >
</template>
