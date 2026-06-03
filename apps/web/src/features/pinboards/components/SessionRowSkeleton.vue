<script setup lang="ts">
import { Skeleton } from "@pinlay/design";
</script>

<template>
  <!-- Mirrors SessionRow: severity bar + ref + favicon + title + url + heatbar + pins + avatar + status. -->
  <div class="relative flex items-center gap-3 border-b px-4 py-4 pl-5 last:border-b-0">
    <span class="absolute inset-y-0 left-0 w-[2px] bg-muted" />
    <Skeleton class="h-3 w-12" />
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <Skeleton class="size-3.5 rounded" />
      <Skeleton class="h-3.5 w-[45%]" />
    </div>
    <Skeleton class="hide-narrow h-3 w-44 shrink-0" />
    <Skeleton class="hide-narrow h-1.5 w-40 shrink-0 rounded-full" />
    <Skeleton class="hide-narrow h-3 w-10 shrink-0" />
    <Skeleton class="hide-narrow size-6 shrink-0 rounded-full" />
    <Skeleton class="h-5 w-16 shrink-0 rounded-full" />
    <Skeleton class="size-4 shrink-0 rounded" />
  </div>
</template>
