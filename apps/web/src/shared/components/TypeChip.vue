<script setup lang="ts">
import type { PinType } from "@pinlay/shared";
import { Badge } from "@pinlay/design";

defineProps<{ type: PinType }>();
</script>

<template>
  <Badge
    variant="secondary"
    class="mono font-normal lowercase text-muted-foreground"
    >{{ type }}</Badge
  >
</template>
