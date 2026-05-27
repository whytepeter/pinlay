<script setup lang="ts">
import { computed } from "vue";
import type { Severity } from "@pinlayer/shared";
import { Badge } from "@pinlayer/design";
import SeverityDot from "./SeverityDot.vue";

const props = defineProps<{ level: Severity }>();

const label = computed(
  () =>
    ({ critical: "Critical", high: "High", medium: "Medium", low: "Low" })[
      props.level
    ],
);
</script>

<template>
  <Badge variant="outline" class="gap-1.5 font-normal">
    <SeverityDot :level="level" :size="6" :ring="false" />
    {{ label }}
  </Badge>
</template>
