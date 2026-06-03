<script setup lang="ts">
import { Skeleton } from "@pinlay/design";
</script>

<template>
  <!-- Mirrors SessionCard structure so the layout doesn't reflow once the
       real cards land. Severity bar on the left, header row (favicon + ref +
       url path + status), title (two lines), heatbar, footer (avatar + name
       + ago + pins). -->
  <div
    class="relative flex flex-col overflow-hidden rounded-lg border bg-card"
  >
    <span class="absolute inset-y-0 left-0 w-[3px] bg-muted" />

    <div class="flex flex-col gap-2.5 p-4 pl-5">
      <div class="flex items-center gap-2">
        <Skeleton class="size-4 rounded" />
        <Skeleton class="h-3 w-12" />
        <Skeleton class="h-3 w-16" />
        <Skeleton class="ml-auto h-5 w-14 rounded-full" />
      </div>
      <Skeleton class="h-4 w-[80%]" />
      <Skeleton class="h-4 w-[55%]" />
      <Skeleton class="h-1.5 w-full rounded-full" />
    </div>

    <div
      class="mt-auto flex items-center gap-2.5 border-t bg-muted/30 px-4 py-2.5 pl-5"
    >
      <Skeleton class="size-5 rounded-full" />
      <Skeleton class="h-3 w-16" />
      <Skeleton class="h-3 w-12" />
      <Skeleton class="ml-auto h-5 w-12 rounded-md" />
    </div>
  </div>
</template>
