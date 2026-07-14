<script setup lang="ts">
/**
 * Auth shell (2026-07-14 v2) — the product demos itself.
 *
 * One centered frosted card on a dot-grid "canvas" washed with a soft brand
 * aurora (same gradient family as the landing hero, dialed way down), with
 * decorative pinlay pins + comment capsules dropped around it — as if someone
 * reviewed the auth page with pinlay. One of them is resolved, so the pair
 * tells the product's whole story: comment → resolve.
 */
import { Brand, Icon, UserAvatar } from "@pinlay/design";

defineProps<{
  title: string;
  subtitle?: string;
}>();

/** Decorative review pins scattered on the canvas (lg+ only). */
const pins = [
  {
    n: 1,
    author: "Maya",
    hue: 152,
    text: "Love this sign-in ✨",
    style: "top: 16%; left: 11%;",
    delay: "0s",
    resolved: false,
  },
  {
    n: 2,
    author: "Sam",
    hue: 32,
    text: "Anchored — survives deploys",
    style: "top: 28%; right: 9%;",
    delay: "1.6s",
    resolved: false,
  },
  {
    n: 3,
    author: "Ade",
    hue: 262,
    text: "Fixed the tab order",
    style: "bottom: 15%; left: 15%;",
    delay: "3.2s",
    resolved: true,
  },
  {
    n: 4,
    author: "Maya",
    hue: 152,
    text: "Ship it today?",
    style: "bottom: 22%; right: 13%;",
    delay: "4.4s",
    resolved: false,
  },
];
</script>

<template>
  <div
    class="auth-canvas relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12"
  >
    <!-- soft brand aurora behind everything — drifts very slowly -->
    <div class="auth-aurora pointer-events-none absolute" aria-hidden="true" />

    <!-- Back to the landing page -->
    <RouterLink
      :to="{ name: 'landing' }"
      class="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] font-medium text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground sm:left-6 sm:top-6"
    >
      <Icon name="arrow-left" :size="12" /> pinlay
    </RouterLink>

    <!-- Decorative review pins — pure chrome, hidden from AT and small screens -->
    <div
      v-for="pin in pins"
      :key="pin.n"
      aria-hidden="true"
      class="auth-pin pointer-events-none absolute hidden select-none lg:block"
      :style="pin.style + `animation-delay: ${pin.delay};`"
    >
      <div class="flex items-start gap-2">
        <span
          v-if="pin.resolved"
          class="flex size-7 shrink-0 items-center justify-center rounded-full bg-status-resolved text-white shadow-[0_4px_12px_color-mix(in_oklab,var(--status-resolved)_45%,transparent)] ring-2 ring-background"
        >
          <Icon name="check" :size="13" :stroke-width="2.5" />
        </span>
        <span
          v-else
          class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground shadow-[0_4px_12px_color-mix(in_oklab,var(--primary)_45%,transparent)] ring-2 ring-background"
        >
          {{ pin.n }}
        </span>
        <span
          class="mt-0.5 flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border/60 bg-card/80 px-3 py-1.5 shadow-sm backdrop-blur-md"
          :class="pin.resolved ? 'opacity-70' : ''"
        >
          <UserAvatar :name="pin.author" :hue="pin.hue" :size="16" />
          <span
            class="text-[12px] font-medium text-foreground"
            :class="pin.resolved ? 'line-through decoration-muted-foreground/60' : ''"
          >
            {{ pin.text }}
          </span>
        </span>
      </div>
    </div>

    <!-- Card -->
    <main class="relative w-full max-w-sm">
      <!-- Brand — a pin, sitting where a pin would sit: on the page, above the card -->
      <div class="mb-6 flex flex-col items-center gap-3">
        <div
          class="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_color-mix(in_oklab,var(--primary)_40%,transparent)] ring-4 ring-background"
        >
          <Brand :size="22" />
        </div>
        <span class="text-[15px] font-semibold tracking-tight text-foreground">pinlay</span>
      </div>

      <div
        class="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[0_20px_50px_-20px_color-mix(in_oklab,var(--primary)_35%,transparent)] backdrop-blur-xl sm:p-8"
      >
        <header class="mb-6 text-center">
          <h1 class="text-[21px] font-semibold tracking-tight text-foreground">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="mt-1 text-[13.5px] leading-snug text-muted-foreground">
            {{ subtitle }}
          </p>
        </header>

        <slot />
      </div>

      <slot name="footer" />
    </main>
  </div>
</template>

<style scoped>
/* Dot-grid canvas — the surface pins live on. Fades out toward the center
   so the card area stays quiet. */
.auth-canvas {
  background-image: radial-gradient(
    color-mix(in oklab, var(--foreground) 10%, transparent) 1px,
    transparent 1px
  );
  background-size: 22px 22px;
}
.auth-canvas::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 70% 60% at 50% 45%,
    var(--background) 25%,
    transparent 100%
  );
  pointer-events: none;
}

/* Soft brand wash — the landing hero's gradient family at whisper volume.
   Oversized past the viewport and drifting on a slow loop so the purple
   glow subtly wanders behind the card. */
.auth-aurora {
  inset: -22%;
  background:
    radial-gradient(
      45% 32% at 50% 8%,
      color-mix(in oklab, var(--primary) 16%, transparent) 0%,
      transparent 70%
    ),
    radial-gradient(
      32% 26% at 82% 88%,
      color-mix(in oklab, var(--primary) 11%, transparent) 0%,
      transparent 70%
    ),
    radial-gradient(
      28% 24% at 12% 70%,
      color-mix(in oklab, var(--primary) 8%, transparent) 0%,
      transparent 70%
    );
  animation: aurora-drift 26s ease-in-out infinite;
}
@keyframes aurora-drift {
  0%,
  100% {
    transform: translate3d(-2.5%, -1.5%, 0) scale(1);
  }
  33% {
    transform: translate3d(2%, 1.5%, 0) scale(1.06);
  }
  66% {
    transform: translate3d(-1%, 2.5%, 0) scale(1.03);
  }
}
@media (prefers-reduced-motion: reduce) {
  .auth-aurora {
    animation: none;
  }
}

/* Gentle bob so the pins read as "alive" without stealing focus. */
.auth-pin {
  animation: auth-pin-float 7s ease-in-out infinite;
}
@keyframes auth-pin-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .auth-pin {
    animation: none;
  }
}
</style>
