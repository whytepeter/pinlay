<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { TooltipProvider } from "@pinlay/design";
import { useShell } from "@/shared/composables/useShell";
import AppSidebar from "./components/AppSidebar.vue";
import StatusBar from "./components/StatusBar.vue";

const { mobileOpen, closeMobile } = useShell();

const route = useRoute();
// Pin detail provides its own header; hide the global status bar there.
// (/s/* is the legacy redirect shim — same treatment while it forwards.)
const isDetail = computed(
  () => route.path.startsWith("/p/") || route.path.startsWith("/s/"),
);
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <div class="min-h-screen bg-background text-foreground">
      <AppSidebar />

      <!-- mobile drawer backdrop -->
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-30 bg-black/40 md:hidden"
        @click="closeMobile"
      />

      <!-- Content reserves only the collapsed rail width; the sidebar floats
           over it on hover, so expanding never shifts the layout. -->
      <div class="flex min-h-screen flex-col md:pl-16">
        <StatusBar v-if="!isDetail" />
        <main class="flex min-h-0 flex-1 flex-col">
          <RouterView />
        </main>
      </div>
    </div>
  </TooltipProvider>
</template>
