<script setup lang="ts">
import { Brand } from "@pinlay/design";

defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div
    class="grid min-h-dvh lg:grid-cols-2"
  >
    <!-- Left: brand / value panel (hidden on small screens) -->
    <aside
      class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex"
    >
      <!-- soft glow accents -->
      <div
        class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl"
      />

      <div class="relative flex items-center gap-2.5">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"
        >
          <Brand :size="20" />
        </div>
        <span class="text-[15px] font-semibold tracking-tight">pinlay</span>
      </div>

      <div class="relative max-w-sm">
        <p class="text-[26px] font-semibold leading-snug tracking-tight">
          Figma-style comments for your live product.
        </p>
        <p class="mt-3 text-[14px] leading-relaxed text-primary-foreground/75">
          Drop pins on any page, anchored to real elements. They survive deploys
          and route straight to your team's tracker.
        </p>
      </div>

      <p class="relative text-[12px] text-primary-foreground/60">
        © {{ new Date().getFullYear() }} pinlay
      </p>
    </aside>

    <!-- Right: form -->
    <main class="flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <!-- mobile brand -->
        <div class="mb-8 flex items-center gap-2.5 lg:hidden">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Brand :size="20" />
          </div>
          <span class="text-[15px] font-semibold tracking-tight text-foreground">
            pinlay
          </span>
        </div>

        <header class="mb-6">
          <h1 class="text-[22px] font-semibold tracking-tight text-foreground">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="mt-1 text-[13.5px] text-muted-foreground">
            {{ subtitle }}
          </p>
        </header>

        <slot />
      </div>
    </main>
  </div>
</template>
