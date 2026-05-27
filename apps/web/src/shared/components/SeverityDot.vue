<script setup lang="ts">
import type { Severity } from "@pinlayer/shared";
import { sevBg, sevRing } from "@/shared/lib/severity";

withDefaults(defineProps<{ level: Severity; size?: number; ring?: boolean }>(), {
  size: 8,
  ring: true,
});
</script>

<template>
  <span
    class="inline-block shrink-0 rounded-full"
    :class="[sevBg[level], ring ? 'ring-[3px]' : '', ring ? sevRing[level] : '']"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>
