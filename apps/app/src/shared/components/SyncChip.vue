<script setup lang="ts">
import { computed } from "vue";
import type { SyncState } from "@pinlayer/shared";
import { Icon } from "@pinlayer/design";

const props = withDefaults(
  defineProps<{ name: string; count: number; state?: SyncState }>(),
  { state: "ok" },
);

const color = computed(
  () =>
    ({
      ok: "var(--status-resolved)",
      pending: "var(--sev-medium)",
      failed: "var(--sev-critical)",
    })[props.state],
);
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
    <Icon name="refresh-cw" :size="11" :style="{ color }" />
    <span class="text-foreground">{{ name }}</span>
    <span class="font-mono">· {{ count }}</span>
  </span>
</template>
