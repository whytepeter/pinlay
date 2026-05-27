<script setup lang="ts">
import { computed } from "vue";
import type { SeverityCounts } from "@pinlayer/shared";
import { SEVERITY_ORDER, sevBg } from "@/shared/lib/severity";
import SeverityDot from "./SeverityDot.vue";

const props = defineProps<{ counts: SeverityCounts }>();

const total = computed(() =>
  SEVERITY_ORDER.reduce((sum, k) => sum + props.counts[k], 0),
);

const segs = computed(() =>
  SEVERITY_ORDER.filter((k) => props.counts[k] > 0).map((k) => ({
    k,
    pct: (props.counts[k] / total.value) * 100,
    n: props.counts[k],
  })),
);
</script>

<template>
  <div v-if="total > 0" class="flex items-center gap-2.5">
    <div class="flex h-1.5 flex-1 gap-0.5 overflow-hidden rounded-full bg-muted">
      <div
        v-for="s in segs"
        :key="s.k"
        :class="sevBg[s.k]"
        :style="{ flexBasis: `${s.pct}%` }"
      />
    </div>
    <div class="flex shrink-0 gap-2 font-mono text-[11px]">
      <span
        v-for="s in segs"
        :key="s.k"
        class="inline-flex items-center gap-1 text-muted-foreground"
      >
        <SeverityDot :level="s.k" :size="5" :ring="false" />{{ s.n }}
      </span>
    </div>
  </div>
</template>
