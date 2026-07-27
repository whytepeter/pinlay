<script setup lang="ts">
/**
 * Shared chrome for the public legal pages (/privacy, /terms).
 *
 * Deliberately plain — no gradient hero, no motion. These pages are read by
 * Chrome Web Store reviewers and by users looking for a specific clause, so
 * legibility beats art direction. Prose rhythm is set here once rather than
 * repeated in each page.
 */
import { RouterLink } from "vue-router";
import { Brand } from "@pinlay/design";
import { EFFECTIVE_DATE } from "./legal-meta";

defineProps<{
  title: string;
  /** One-line summary shown under the title. */
  intro: string;
}>();
</script>

<template>
  <div class="min-h-dvh bg-background">
    <nav class="border-b border-border/60">
      <div
        class="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4 sm:px-8"
      >
        <RouterLink
          :to="{ name: 'landing' }"
          class="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground"
        >
          <span
            class="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Brand :size="14" />
          </span>
          pinlay
        </RouterLink>
        <div
          class="ml-auto flex items-center gap-5 text-[13px] text-muted-foreground"
        >
          <RouterLink
            :to="{ name: 'privacy' }"
            class="transition-colors hover:text-foreground"
            active-class="text-foreground font-medium"
          >
            Privacy
          </RouterLink>
          <RouterLink
            :to="{ name: 'terms' }"
            class="transition-colors hover:text-foreground"
            active-class="text-foreground font-medium"
          >
            Terms
          </RouterLink>
        </div>
      </div>
    </nav>

    <main class="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <header class="mb-10">
        <h1
          class="text-[32px] font-semibold leading-tight tracking-tight text-foreground sm:text-[40px]"
        >
          {{ title }}
        </h1>
        <p class="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {{ intro }}
        </p>
        <p class="mt-4 text-[13px] text-muted-foreground">
          Effective {{ EFFECTIVE_DATE }}
        </p>
      </header>

      <!-- Typographic rhythm for the page body. Child pages supply plain
           semantic markup; the spacing/scale rules live here so every legal
           page reads identically. -->
      <div
        class="text-[15px] leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_li]:mb-1.5 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
      >
        <slot />
      </div>
    </main>

    <footer class="border-t border-border/60">
      <div
        class="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-6 text-[12px] text-muted-foreground sm:px-8"
      >
        <span class="flex items-center gap-1.5">
          <Brand :size="13" class="text-primary" /> pinlay ·
          {{ new Date().getFullYear() }}
        </span>
        <RouterLink
          :to="{ name: 'landing' }"
          class="ml-auto transition-colors hover:text-foreground"
        >
          Home
        </RouterLink>
        <RouterLink
          :to="{ name: 'privacy' }"
          class="transition-colors hover:text-foreground"
        >
          Privacy
        </RouterLink>
        <RouterLink
          :to="{ name: 'terms' }"
          class="transition-colors hover:text-foreground"
        >
          Terms
        </RouterLink>
      </div>
    </footer>
  </div>
</template>
