<script setup lang="ts">
/**
 * Landing page (2026-07-14, v2) — the product demos itself, dressed up.
 *
 * Layout language borrowed from high-craft SaaS landers (Lumio ref): a
 * saturated brand-gradient hero panel with a serif-italic headline accent,
 * the product framed in faux browser chrome emerging from the hero, mono
 * uppercase section eyebrows, numbered step cards with mini-visuals, big
 * stat numbers, and a full-color closing CTA panel.
 *
 * pinlay's own twist stays: the "screenshot" in the browser chrome is a REAL
 * mock page carrying REAL interactive pins — click one, read the thread,
 * resolve it. Copy discipline (ROADMAP "Positioning"): the wedge sentence is
 * the hero, the anchor moat is the numeric proof point, and the
 * anti-positioning line keeps us out of the project-board bucket.
 */
import { computed, ref } from "vue";
import type { Directive } from "vue";
import { Brand, Button, Icon, UserAvatar } from "@pinlay/design";
import DemoPin, { type LandingPin } from "./DemoPin.vue";

/**
 * v-reveal — fade-up the element once it scrolls into view. Optional binding
 * value = transition delay in ms (for staggering siblings). No-op under
 * prefers-reduced-motion. Elements above the fold reveal immediately on
 * load, which doubles as the hero's entrance animation.
 */
const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("reveal");
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`;

    let io: IntersectionObserver | undefined;
    const reveal = () => {
      el.classList.add("revealed");
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const inView = () =>
      el.getBoundingClientRect().top < window.innerHeight - 48;
    const onScroll = () => {
      if (inView()) reveal();
    };

    // Above the fold: reveal on the next tick so the entrance transition
    // still plays (this is the hero's load animation).
    if (inView()) {
      setTimeout(reveal, 60);
      return;
    }

    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) reveal();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    io.observe(el);
    // Belt-and-braces for environments where IO is throttled or inert
    // (embedded webviews); removed after the first reveal.
    window.addEventListener("scroll", onScroll, { passive: true });
  },
};

const demoPins = ref<LandingPin[]>([
  {
    id: 1,
    author: "Maya (QA)",
    hue: 152,
    time: "2m ago",
    comment: "This headline wraps weird on my 13″ — can we tighten it?",
    resolved: false,
    side: "right",
  },
  {
    id: 2,
    author: "Sam (PM)",
    hue: 32,
    time: "1h ago",
    comment: "Love the CTA. Ship it today?",
    resolved: false,
    side: "right",
  },
  {
    id: 3,
    author: "Ade (Design)",
    hue: 262,
    time: "just now",
    comment: "Pinned to this exact element — reload, it's still here.",
    resolved: false,
    side: "left",
  },
]);

const openPinId = ref<number | null>(null);
const openCount = computed(
  () => demoPins.value.filter((p) => !p.resolved).length
);

function togglePin(id: number) {
  openPinId.value = openPinId.value === id ? null : id;
}
function resolvePin(pin: LandingPin) {
  pin.resolved = true;
  openPinId.value = null;
}
function pinById(id: number): LandingPin {
  return demoPins.value.find((p) => p.id === id)!;
}

const steps = [
  {
    label: "01 — Install",
    title: "Install the extension",
    text: "One click from the Chrome Web Store. No SDK, no snippet, nothing to deploy.",
  },
  {
    label: "02 — Pin",
    title: "Pin anything on your live site",
    text: "Click an element, type a comment, send. Screenshot captured automatically.",
  },
  {
    label: "03 — Resolve",
    title: "Resolve it on the page",
    text: "Your dev walks the open pins on the live site and checks them off in context.",
  },
];

const stats = [
  {
    value: "9/9",
    label: "DOM-mutation scenarios re-anchored in our test harness",
  },
  { value: "0", label: "snippets, SDKs or code changes to deploy" },
  { value: "1", label: "click to install — pin your site a minute later" },
];
</script>

<template>
  <div class="min-h-dvh bg-background text-foreground">
    <!-- ── Hero — full-bleed gradient canvas, contained content ──────────── -->
    <section class="relative">
      <!-- gradient + streak backdrop, edge to edge -->
      <div
        class="hero-aurora absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div class="hero-streaks absolute inset-0" />
      </div>

      <!-- flow-root keeps the mock's negative bottom margin from collapsing
           through this box — the section (and its gradient) must end mid-mock
           so the mock straddles into the white area below. -->
      <div class="relative mx-auto flow-root max-w-6xl px-5 sm:px-10">
        <!-- Nav -->
        <nav class="relative flex items-center gap-3 py-5">
          <div class="flex items-center gap-2.5">
            <span
              class="flex size-8 items-center justify-center rounded-full bg-white text-primary shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
            >
              <Brand :size="16" />
            </span>
            <span class="text-[15px] font-semibold tracking-tight text-white"
              >pinlay</span
            >
          </div>
          <div
            class="ml-8 hidden items-center gap-6 text-[13px] font-medium text-white/70 sm:flex"
          >
            <a href="#how-it-works" class="transition-colors hover:text-white"
              >How it works</a
            >
            <a href="#why-pinlay" class="transition-colors hover:text-white"
              >Why pinlay</a
            >
          </div>
          <div class="ml-auto flex items-center gap-2">
            <RouterLink :to="{ name: 'login' }">
              <Button
                variant="ghost"
                size="sm"
                class="text-white hover:bg-white/15 hover:text-white"
              >
                Sign in
              </Button>
            </RouterLink>
            <RouterLink :to="{ name: 'signup' }">
              <Button
                size="sm"
                class="border-white/40 bg-white text-primary hover:bg-white/90"
              >
                Get started
              </Button>
            </RouterLink>
          </div>
        </nav>

        <!-- Hero copy -->
        <header
          class="relative mx-auto max-w-2xl pb-12 pt-10 text-center sm:pt-16"
        >
          <p
            v-reveal
            class="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 py-1 pl-1.5 pr-3.5 text-[12px] font-medium text-white backdrop-blur-md"
          >
            <span
              class="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary"
              >New</span
            >
            Pins survive deploys — anchored to elements, not pixels
          </p>
          <h1
            v-reveal="80"
            class="text-balance text-[38px] font-bold leading-[1.06] tracking-tight text-white sm:text-[54px]"
          >
            Comments that stick
            <span class="serif-accent">to your live site.</span>
          </h1>
          <p
            v-reveal="160"
            class="mx-auto mt-5 max-w-md text-balance text-[15px] leading-relaxed text-white/75 sm:text-[16px]"
          >
            Drop pins on real elements of your product. They survive deploys,
            and your developers resolve them right on the page.
          </p>
          <div
            v-reveal="240"
            class="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <RouterLink :to="{ name: 'signup' }">
              <Button
                size="lg"
                class="border-white/40 bg-white px-7 text-[14.5px] font-semibold text-primary hover:bg-white/90"
              >
                Start pinning — it's free
              </Button>
            </RouterLink>
            <RouterLink :to="{ name: 'login' }">
              <Button
                size="lg"
                variant="outline"
                class="border-white/30 bg-white/10 px-6 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
              >
                Sign in
              </Button>
            </RouterLink>
          </div>
        </header>

        <!-- The product, in browser chrome, straddling the hero's bottom edge —
             the negative margin shrinks the section (and its gradient) so the
             mock's lower half hangs into the white section below.
             The "screenshot" is a live mock page with REAL interactive pins. -->
        <div
          v-reveal="320"
          class="reveal-mock relative mx-auto -mb-28 max-w-7xl sm:-mb-60"
        >
          <div
            class="overflow-visible rounded-xl bg-card shadow-[0_50px_100px_-30px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,0,0,0.08)]"
          >
            <!-- browser bar -->
            <div
              class="flex items-center gap-2.5 rounded-t-xl border-b border-border/60 bg-muted/50 px-4 py-2.5 sm:gap-4"
            >
              <span class="flex gap-2" aria-hidden="true">
                <span class="size-3 rounded-full bg-[#ff5f57]" />
                <span class="size-3 rounded-full bg-[#febc2e]" />
                <span class="size-3 rounded-full bg-[#28c840]" />
              </span>
              <span
                class="hidden items-center gap-3 text-muted-foreground/50 sm:flex"
                aria-hidden="true"
              >
                <Icon name="arrow-left" :size="14" />
                <Icon name="arrow-right" :size="14" class="opacity-40" />
                <Icon name="rotate-cw" :size="12" />
              </span>
              <span
                class="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-background/80 px-4 py-1.5 text-[11.5px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]"
              >
                <Icon
                  name="lock"
                  :size="10"
                  class="shrink-0 text-muted-foreground/70"
                />
                <span class="truncate">
                  <span class="text-foreground/80">yourapp.com</span
                  >/spring-launch
                </span>
              </span>
              <span
                class="hidden items-center gap-3 sm:flex"
                aria-hidden="true"
              >
                <span
                  class="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10.5px] font-semibold text-primary"
                >
                  <span
                    class="size-1.5 animate-pulse rounded-full bg-primary"
                  />
                  pinlay on
                </span>
                <span
                  class="flex size-6 items-center justify-center rounded-full bg-linear-to-br from-primary/70 to-primary text-[9px] font-bold text-primary-foreground"
                  >M</span
                >
              </span>
            </div>

            <!-- mock page the pins are anchored to -->
            <div class="rounded-b-xl px-6 pb-8 pt-5 sm:px-12 sm:pb-12 sm:pt-6">
              <!-- mock site nav -->
              <div class="flex items-center gap-2.5">
                <span
                  class="size-6 rounded-lg bg-linear-to-br from-primary to-primary/60"
                />
                <span
                  class="text-[13px] font-bold tracking-tight text-foreground"
                  >acme</span
                >
                <span
                  class="ml-8 hidden gap-5 text-[11.5px] font-medium text-muted-foreground sm:flex"
                >
                  <span>Product</span>
                  <span>Pricing</span>
                  <span>Changelog</span>
                </span>
                <span
                  class="ml-auto rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-foreground"
                  >Sign in</span
                >
              </div>

              <div
                class="mt-9 grid items-center gap-8 sm:mt-11 sm:grid-cols-[1.15fr_1fr] sm:gap-14"
              >
                <div>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10.5px] font-semibold text-primary"
                  >
                    <span class="size-1 rounded-full bg-primary" /> Spring
                    release
                  </span>
                  <!-- pin 1 → anchored to the headline -->
                  <div class="relative mt-3 inline-block">
                    <h3
                      class="text-[26px] font-bold leading-[1.12] tracking-tight text-foreground sm:text-[32px]"
                    >
                      Everything your team shipped this spring
                    </h3>
                    <DemoPin
                      class="-right-4 -top-4"
                      :pin="pinById(1)"
                      :open="openPinId === 1"
                      @toggle="togglePin(1)"
                      @resolve="resolvePin(pinById(1))"
                    />
                  </div>
                  <p class="mt-4 space-y-2">
                    <span
                      class="block h-2.5 w-full rounded-full bg-foreground/8"
                    />
                    <span
                      class="block h-2.5 w-5/6 rounded-full bg-foreground/8"
                    />
                    <span
                      class="block h-2.5 w-3/5 rounded-full bg-foreground/8"
                    />
                  </p>
                  <div class="mt-6 flex items-center gap-3">
                    <!-- pin 2 → anchored to the CTA -->
                    <div class="relative inline-block">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-[0_4px_14px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                      >
                        Start free trial <Icon name="arrow-right" :size="13" />
                      </span>
                      <DemoPin
                        class="-right-4 -top-4"
                        :pin="pinById(2)"
                        :open="openPinId === 2"
                        @toggle="togglePin(2)"
                        @resolve="resolvePin(pinById(2))"
                      />
                    </div>
                    <span
                      class="hidden rounded-full border border-border px-5 py-2.5 text-[13px] font-semibold text-muted-foreground sm:inline-block"
                      >See what's new</span
                    >
                  </div>
                  <!-- social proof strip -->
                  <div class="mt-7 flex items-center gap-3">
                    <span class="flex -space-x-1.5">
                      <UserAvatar
                        name="Maya K"
                        :hue="152"
                        :size="22"
                        class="ring-2 ring-card"
                      />
                      <UserAvatar
                        name="Sam O"
                        :hue="32"
                        :size="22"
                        class="ring-2 ring-card"
                      />
                      <UserAvatar
                        name="Ade B"
                        :hue="262"
                        :size="22"
                        class="ring-2 ring-card"
                      />
                    </span>
                    <span class="h-2 w-28 rounded-full bg-foreground/8" />
                  </div>
                </div>

                <!-- pin 3 → anchored to the analytics card -->
                <div class="relative hidden sm:block">
                  <div
                    class="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.18)]"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p
                          class="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          Weekly active
                        </p>
                        <p
                          class="mt-1 text-[24px] font-bold leading-none tracking-tight text-foreground"
                        >
                          12,480
                        </p>
                      </div>
                      <span
                        class="flex items-center gap-1 rounded-full bg-status-resolved/10 px-2 py-0.5 text-[10.5px] font-semibold text-status-resolved"
                      >
                        <Icon name="trending-up" :size="11" /> +18%
                      </span>
                    </div>
                    <!-- bar chart -->
                    <div
                      class="mt-5 flex h-24 items-end gap-1.5"
                      aria-hidden="true"
                    >
                      <span
                        v-for="(h, i) in [
                          34, 52, 44, 66, 58, 78, 70, 92, 84, 100,
                        ]"
                        :key="i"
                        class="mock-bar flex-1 rounded-t-[3px]"
                        :class="i >= 8 ? 'bg-primary' : 'bg-primary/25'"
                        :style="{
                          height: h + '%',
                          animationDelay: 400 + i * 45 + 'ms',
                        }"
                      />
                    </div>
                    <div class="mt-3 flex justify-between" aria-hidden="true">
                      <span class="h-1.5 w-8 rounded-full bg-foreground/8" />
                      <span class="h-1.5 w-8 rounded-full bg-foreground/8" />
                      <span class="h-1.5 w-8 rounded-full bg-foreground/8" />
                    </div>
                  </div>
                  <DemoPin
                    class="-right-3.5 top-1/2 -mt-4"
                    :pin="pinById(3)"
                    :open="openPinId === 3"
                    @toggle="togglePin(3)"
                    @resolve="resolvePin(pinById(3))"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- room for the overlapping browser bottom -->
    <div class="h-40 sm:h-80" />

    <!-- live counter chip — mirrors the extension FAB -->
    <div v-reveal class="flex justify-center px-5">
      <span
        class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-[12.5px] font-medium shadow-sm"
      >
        <template v-if="openCount > 0">
          <span class="size-2 rounded-full bg-primary" />
          {{ openCount }} open pin{{ openCount === 1 ? "" : "s" }} on this page
          — try resolving them
        </template>
        <template v-else>
          <Icon name="party-popper" :size="14" class="text-status-resolved" />
          All resolved. Your site next?
          <RouterLink
            :to="{ name: 'signup' }"
            class="font-semibold text-primary hover:underline"
            >Get started</RouterLink
          >
        </template>
      </span>
    </div>

    <!-- ── How it works ────────────────────────────────────────────────── -->
    <section id="how-it-works" class="mx-auto max-w-6xl scroll-mt-8 px-5 py-20">
      <div v-reveal class="mb-10 flex flex-col items-center gap-3 text-center">
        <span
          class="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          <span class="size-1.5 bg-primary" aria-hidden="true" /> How it works
        </span>
        <h2
          class="max-w-md text-balance text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]"
        >
          From "that looks off" to fixed,
          <span class="serif-accent text-primary">in three steps.</span>
        </h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="(step, i) in steps"
          :key="step.title"
          v-reveal="i * 110"
          class="flex flex-col rounded-2xl border border-border/70 bg-card p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--foreground)_25%,transparent)]"
        >
          <!-- mini visual -->
          <div
            class="flex h-28 items-center justify-center rounded-xl border border-border/50 bg-muted/40"
            aria-hidden="true"
          >
            <!-- 01 · install chip -->
            <span
              v-if="step.label.startsWith('01')"
              class="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 shadow-sm"
            >
              <Icon name="puzzle" :size="15" class="text-primary" />
              <span class="text-[12.5px] font-semibold">pinlay</span>
              <span
                class="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground"
                >Add</span
              >
            </span>
            <!-- 02 · pin + capsule -->
            <span
              v-else-if="step.label.startsWith('02')"
              class="flex items-start gap-2"
            >
              <span
                class="flex size-7 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground shadow-[0_4px_12px_color-mix(in_oklab,var(--primary)_45%,transparent)] ring-2 ring-card"
                >1</span
              >
              <span
                class="mt-0.5 rounded-2xl rounded-tl-md border border-border/70 bg-card px-3 py-1.5 text-[12px] font-medium shadow-sm"
              >
                Logo is off-center
              </span>
            </span>
            <!-- 03 · resolved capsule -->
            <span
              v-else
              class="flex items-center gap-2 rounded-full border border-status-resolved/30 bg-status-resolved/10 px-3.5 py-2"
            >
              <span
                class="flex size-5 items-center justify-center rounded-full bg-status-resolved text-white"
              >
                <Icon name="check" :size="11" :stroke-width="3" />
              </span>
              <span class="text-[12.5px] font-semibold text-status-resolved"
                >Resolved on page</span
              >
            </span>
          </div>

          <span
            class="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            {{ step.label }}
          </span>
          <h3 class="mt-1.5 text-[15px] font-semibold">{{ step.title }}</h3>
          <p class="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {{ step.text }}
          </p>
        </div>
      </div>
    </section>

    <!-- ── The moat ────────────────────────────────────────────────────── -->
    <section id="why-pinlay" class="mx-auto max-w-6xl scroll-mt-8 px-5 pb-20">
      <div
        class="rounded-[28px] border border-border/70 bg-card px-6 py-12 sm:px-14"
      >
        <div v-reveal class="flex flex-col items-center gap-3 text-center">
          <span
            class="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span class="size-1.5 bg-status-resolved" aria-hidden="true" /> The
            anchor moat
          </span>
          <h2
            class="max-w-lg text-balance text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]"
          >
            Screenshots go stale.
            <span class="serif-accent text-primary">Pins re-anchor.</span>
          </h2>
          <p class="max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Every pin holds a resilient fingerprint of its element — not just
            coordinates. When your app redeploys, pinlay re-finds the element
            and the conversation stays exactly where it belongs.
          </p>
        </div>

        <div
          class="mt-10 grid gap-8 border-t border-border/60 pt-10 sm:grid-cols-3"
        >
          <div
            v-for="(stat, i) in stats"
            :key="stat.value"
            v-reveal="i * 110"
            class="text-center"
          >
            <div
              class="text-[44px] font-bold leading-none tracking-tight text-primary"
            >
              {{ stat.value }}
            </div>
            <p
              class="mx-auto mt-3 max-w-[220px] text-[13px] leading-snug text-muted-foreground"
            >
              {{ stat.label }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Anti-positioning + closing CTA — full-bleed gradient ────────── -->
    <section class="relative overflow-hidden">
      <div class="hero-aurora absolute inset-0" aria-hidden="true">
        <div class="hero-streaks absolute inset-0" />
      </div>
      <div class="relative mx-auto max-w-6xl px-5 sm:px-10">
        <div
          v-reveal
          class="flex flex-col items-center px-6 py-16 text-center sm:py-20"
        >
          <p
            class="max-w-lg text-balance text-[24px] font-bold leading-tight tracking-tight text-white sm:text-[30px]"
          >
            Not another project board.
          </p>
          <p
            class="mt-3 max-w-md text-balance text-[14.5px] leading-relaxed text-white/75"
          >
            An inbox you glance at, and an overlay your developers live in.
          </p>
          <RouterLink :to="{ name: 'signup' }" class="mt-8 inline-block">
            <Button
              size="lg"
              class="border-white/40 bg-white px-8 text-[14.5px] font-semibold text-primary hover:bg-white/90"
            >
              <Icon name="map-pin" :size="15" /> Drop your first pin
            </Button>
          </RouterLink>
          <p class="mt-4 text-[12.5px] text-white/60">
            Free while in beta · No snippet to install
          </p>
        </div>
      </div>
    </section>

    <footer class="border-t border-border/50">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-[12px] text-muted-foreground"
      >
        <span class="flex items-center gap-1.5">
          <Brand :size="13" class="text-primary" /> pinlay ·
          {{ new Date().getFullYear() }}
        </span>
        <RouterLink :to="{ name: 'login' }" class="hover:text-foreground">
          Sign in
        </RouterLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Brand-gradient hero canvas. Derived from --primary via color-mix so an
   accent swap reskins the whole lander. Utilities can't express the layered
   radial composition, hence the one scoped class. */
.hero-aurora {
  background: radial-gradient(
      110% 85% at 75% -5%,
      color-mix(in oklab, var(--primary) 45%, #ffffff) 0%,
      transparent 55%
    ),
    radial-gradient(
      95% 75% at 10% 105%,
      color-mix(in oklab, var(--primary) 55%, #06001a) 0%,
      transparent 60%
    ),
    linear-gradient(
      160deg,
      color-mix(in oklab, var(--primary) 88%, #000000) 0%,
      var(--primary) 48%,
      color-mix(in oklab, var(--primary) 62%, #2e1065) 100%
    );
}

/* Soft vertical light streaks over the gradient (Lumio-style curtain). */
.hero-streaks {
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.07) 0px,
    rgba(255, 255, 255, 0) 3px,
    rgba(255, 255, 255, 0) 34px,
    rgba(255, 255, 255, 0.04) 37px,
    rgba(255, 255, 255, 0) 40px,
    rgba(255, 255, 255, 0) 72px
  );
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.35));
}

/* ── Scroll-reveal (paired with the v-reveal directive) ─────────────────
   Elements start faded + shifted down; `revealed` (added when the element
   enters the viewport) transitions them in. The directive no-ops under
   prefers-reduced-motion, so these classes are never applied there. */
.reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.65s ease, transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}
.reveal.revealed {
  opacity: 1;
  transform: none;
}
/* The browser mock gets a touch of scale for a "settling down" feel. */
.reveal-mock.reveal {
  transform: translateY(30px) scale(0.975);
}
.reveal-mock.reveal.revealed {
  transform: none;
}

/* Analytics-card bars grow up once the mock has revealed. */
.mock-bar {
  transform-origin: bottom;
}
.reveal-mock.revealed .mock-bar {
  animation: bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes bar-grow {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reveal-mock.revealed .mock-bar {
    animation: none;
  }
}

/* Serif-italic headline accent (Lumio's sans-bold + serif-italic mix). */
.serif-accent {
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  font-style: italic;
  font-weight: 500;
  letter-spacing: -0.01em;
}
</style>
