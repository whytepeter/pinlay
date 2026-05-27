<script setup lang="ts">
import type { PinType } from "@pinlayer/shared";
import { Badge } from "@pinlayer/design";

defineProps<{ type: PinType }>();
</script>

<template>
  <Badge
    variant="secondary"
    class="mono font-normal lowercase text-muted-foreground"
    >{{ type }}</Badge
  >
</template>
