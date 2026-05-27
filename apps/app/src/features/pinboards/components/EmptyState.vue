<script setup lang="ts">
import { Button, Icon } from "@pinlayer/design";
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center"
  >
    <span
      class="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary"
    >
      <Icon name="map-pin" :size="22" />
    </span>
    <div class="text-base font-medium">No sessions match</div>
    <p class="max-w-sm text-sm text-muted-foreground">
      Try clearing filters, or install the extension and drop your first pin —
      sessions show up here for triage.
    </p>
    <div class="flex gap-2 pt-1">
      <Button><Icon name="puzzle" :size="14" /> Install extension</Button>
      <Button variant="outline">Watch demo</Button>
    </div>
  </div>
</template>
