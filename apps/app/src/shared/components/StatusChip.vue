<script setup lang="ts">
import { computed } from "vue";
import type { DisplayStatus } from "@pinlayer/shared";

const props = defineProps<{ status: DisplayStatus; dotOnly?: boolean }>();

const map = {
  open: { label: "Open", color: "var(--status-open)" },
  in_progress: { label: "In progress", color: "var(--status-progress)" },
  resolved: { label: "Resolved", color: "var(--status-resolved)" },
} as const;

const s = computed(() => map[props.status] ?? map.open);
</script>

<template>
  <span
    v-if="dotOnly"
    class="inline-block size-[7px] shrink-0 rounded-full"
    :style="{ background: s.color }"
    :title="s.label"
  />
  <span
    v-else
    class="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-medium text-foreground"
    :style="{ borderColor: `color-mix(in oklab, ${s.color} 35%, var(--border))` }"
  >
    <span class="size-1.5 shrink-0 rounded-full" :style="{ background: s.color }" />
    {{ s.label }}
  </span>
</template>
