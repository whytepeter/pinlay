<script setup lang="ts">
/**
 * App shell (2026-07-10 redesign): one frosted top navbar, no sidebar, no
 * status bar. Detail pages (/p/*, legacy /s/*) provide their own back-header
 * — iOS push-navigation style — so the navbar hides there.
 */
import { computed } from "vue";
import { useRoute } from "vue-router";
import { TooltipProvider } from "@pinlay/design";
import AppNavbar from "./components/AppNavbar.vue";

const route = useRoute();
const isDetail = computed(
  () => route.path.startsWith("/p/") || route.path.startsWith("/s/"),
);
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <div class="min-h-dvh bg-background text-foreground">
      <AppNavbar v-if="!isDetail" />
      <main class="flex min-h-0 flex-col">
        <RouterView />
      </main>
    </div>
  </TooltipProvider>
</template>
