<script setup lang="ts">
import { Skeleton } from "@pinlay/design";
</script>

<template>
  <!-- Mirrors IssuePage layout: top header, then 340px pin-list rail
       (desktop only) + pin-detail panel. Keeps the user oriented before the
       fetch completes so the page doesn't jump on load. -->
  <div class="flex h-screen flex-col bg-background text-foreground">
    <!-- header -->
    <header class="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <Skeleton class="h-7 w-20" />
      <Skeleton class="hide-mobile h-3 w-14" />
      <div class="flex min-w-0 flex-1 items-center gap-1.5">
        <Skeleton class="size-4 rounded" />
        <Skeleton class="h-4 w-[40%] max-w-[280px]" />
      </div>
      <Skeleton class="hidden h-8 w-24 md:block" />
      <Skeleton class="hidden h-8 w-20 md:block" />
      <Skeleton class="h-8 w-28" />
    </header>

    <!-- body -->
    <div class="flex min-h-0 flex-1">
      <!-- pin-list rail -->
      <div class="hidden w-[340px] shrink-0 flex-col border-r md:flex">
        <!-- session meta -->
        <div class="flex flex-col gap-2.5 border-b p-4">
          <div class="flex items-center gap-2">
            <Skeleton class="size-3.5 rounded" />
            <Skeleton class="h-3 flex-1" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton class="size-5 rounded-full" />
            <Skeleton class="h-3 w-16" />
            <Skeleton class="h-3 w-14" />
            <Skeleton class="ml-auto h-5 w-14 rounded-full" />
          </div>
        </div>
        <div class="flex items-center gap-2 border-b px-4 py-2">
          <Skeleton class="h-3 w-12" />
          <Skeleton class="ml-auto h-3 w-20" />
        </div>
        <!-- pin items -->
        <div class="flex-1">
          <div
            v-for="i in 4"
            :key="`pin-${i}`"
            class="flex flex-col gap-1.5 border-b px-4 py-3 pl-5 last:border-b-0"
          >
            <div class="flex items-center gap-2">
              <Skeleton class="h-4 w-7" />
              <Skeleton class="size-2 rounded-full" />
              <Skeleton class="h-3.5 flex-1" />
            </div>
            <div class="flex items-center gap-2 pl-[34px]">
              <Skeleton class="h-4 w-14 rounded" />
              <Skeleton class="ml-auto size-4 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- pin detail panel -->
      <div class="min-w-0 flex-1 flex-col md:flex">
        <!-- sticky header -->
        <div class="flex flex-col gap-3 border-b px-4 py-4 sm:px-6">
          <div class="flex items-center gap-2">
            <Skeleton class="h-5 w-8" />
            <Skeleton class="h-5 w-16 rounded-full" />
            <Skeleton class="h-5 w-12 rounded" />
            <div class="ml-auto flex items-center gap-1">
              <Skeleton class="size-8" />
              <Skeleton class="size-8" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Skeleton class="h-8 w-24" />
            <Skeleton class="h-8 w-20" />
            <Skeleton class="ml-auto h-8 w-24" />
          </div>
          <Skeleton class="h-6 w-[70%]" />
        </div>

        <!-- body -->
        <div class="min-h-0 flex-1 overflow-y-auto">
          <div
            class="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-6 sm:px-6"
          >
            <Skeleton class="h-3 w-[80%]" />
            <Skeleton class="h-3 w-[60%]" />
            <Skeleton class="aspect-[16/9] w-full rounded-lg" />
            <div class="rounded-lg border bg-card p-4">
              <Skeleton class="mb-3 h-4 w-32" />
              <div class="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2">
                <template v-for="i in 4" :key="`row-${i}`">
                  <Skeleton class="h-3 w-20" />
                  <Skeleton class="h-3 w-full max-w-[280px]" />
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
