<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; badge?: string }>();
</script>

<template>
  <div
    class="flex flex-col gap-3 border-b border-border bg-bg-1 px-4 pb-4 pt-6 md:flex-row md:items-end md:justify-between md:gap-4 md:px-8"
  >
    <div class="flex min-w-0 flex-col gap-1">
      <div class="flex items-center gap-2">
        <h1 class="truncate text-xl font-semibold tracking-tight">
          {{ title }}
        </h1>
        <span
          v-if="badge"
          class="shrink-0 whitespace-nowrap rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
          >{{ badge }}</span
        >
      </div>
      <p v-if="subtitle" class="text-sm text-muted-foreground">
        {{ subtitle }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
