<script setup lang="ts">
/**
 * The Pin Inbox — the dashboard's home (v2, 2026-07-10 iOS pass).
 *
 * Layout language is iOS grouped-inset lists: pins cluster under day
 * headers (Today / Yesterday / date) inside one rounded container with
 * hairline separators. Each row carries a resolve circle (Things-style
 * check-off) so triage never needs the detail page. Deliberately NOT a
 * project board — see ROADMAP.md "Product principles".
 */
import { computed, ref } from "vue";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Input,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@pinlay/design";
import type { InboxPin, InboxState } from "@/shared/lib/api";
import { timeAgo } from "@/shared/lib/format";
import { hashHue } from "@/shared/lib/issue-display";
import { usePinInbox, useQuickStatus } from "./composables/usePins";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import Favicon from "@/shared/components/Favicon.vue";

const state = ref<InboxState>("open");
const site = ref<string | null>(null);
const q = ref("");

const { query, pins, total, sites } = usePinInbox({ state, site, q });
const quickStatus = useQuickStatus();

const STATUS_COLOR: Record<string, string> = {
  open: "var(--status-open)",
  in_progress: "var(--status-progress)",
  resolved: "var(--status-resolved)",
};

/** True only when the workspace has never seen a pin — drives onboarding. */
const isBlankWorkspace = computed(
  () =>
    !query.isPending.value &&
    total.value === 0 &&
    state.value === "open" &&
    !site.value &&
    !q.value.trim(),
);

// ── Day grouping (Today / Yesterday / Month D) ────────────────────────────
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

const groups = computed<{ label: string; pins: InboxPin[] }[]>(() => {
  const out: { label: string; pins: InboxPin[] }[] = [];
  for (const pin of pins.value) {
    const label = dayLabel(pin.createdAt);
    const last = out[out.length - 1];
    if (last && last.label === label) last.pins.push(pin);
    else out.push({ label, pins: [pin] });
  }
  return out;
});

function hostPath(pageUrl: string): { host: string; path: string } {
  try {
    const u = new URL(pageUrl);
    return { host: u.host, path: u.pathname === "/" ? "" : u.pathname };
  } catch {
    return { host: pageUrl, path: "" };
  }
}

function firstImage(pin: InboxPin) {
  return (
    pin.attachments.find((a) => a.contentType.startsWith("image/")) ?? null
  );
}

// ── Inline resolve circle ─────────────────────────────────────────────────
const pendingId = ref<string | null>(null);

function toggleResolve(pin: InboxPin) {
  pendingId.value = pin.id;
  quickStatus.mutate(
    {
      id: pin.id,
      status: pin.status === "resolved" ? "open" : "resolved",
    },
    { onSettled: () => (pendingId.value = null) },
  );
}
</script>

<template>
  <div
    class="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6"
    style="padding-bottom: calc(2.5rem + env(safe-area-inset-bottom))"
  >
    <!-- header -->
    <div class="mb-5">
      <h1 class="text-2xl font-bold tracking-tight">Pins</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        {{ total }} {{ state === "all" ? "" : state }}
        pin{{ total === 1 ? "" : "s" }}
        {{ site ? `on ${site}` : "across your sites" }}
      </p>
    </div>

    <!-- filters -->
    <div class="mb-5 flex flex-wrap items-center gap-2">
      <Tabs v-model="state">
        <TabsList class="rounded-full">
          <TabsTrigger value="open" class="rounded-full px-4">Open</TabsTrigger>
          <TabsTrigger value="resolved" class="rounded-full px-4">Resolved</TabsTrigger>
          <TabsTrigger value="all" class="rounded-full px-4">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <DropdownMenu v-if="(sites.data.value?.length ?? 0) > 1">
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="min-h-[36px] gap-1.5 rounded-full">
            <Icon name="globe" :size="14" />
            <span class="max-w-[140px] truncate">{{ site ?? "All sites" }}</span>
            <Icon name="chevron-down" :size="13" class="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-64">
          <DropdownMenuItem @click="site = null">
            <span class="flex-1">All sites</span>
            <Icon v-if="!site" name="check" :size="14" />
          </DropdownMenuItem>
          <DropdownMenuItem
            v-for="s in sites.data.value"
            :key="s.host"
            @click="site = s.host"
          >
            <span class="min-w-0 flex-1 truncate">{{ s.host }}</span>
            <span class="font-mono text-[11px] text-muted-foreground">{{ s.count }}</span>
            <Icon v-if="site === s.host" name="check" :size="14" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div class="relative ml-auto w-full sm:w-56">
        <Icon
          name="search"
          :size="14"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <!-- text-base on mobile stops iOS Safari zooming the page on focus -->
        <Input
          v-model="q"
          placeholder="Search pins"
          class="h-9 rounded-full pl-9 text-base sm:text-sm"
        />
      </div>
    </div>

    <!-- loading -->
    <div v-if="query.isPending.value" class="overflow-hidden rounded-2xl border bg-card">
      <div
        v-for="i in 5"
        :key="i"
        class="flex items-center gap-3 p-3"
        :class="i > 1 ? 'border-t border-border/60' : ''"
      >
        <Skeleton class="size-14 shrink-0 rounded-xl" />
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton class="h-4 w-3/5" />
          <Skeleton class="h-3 w-2/5" />
        </div>
      </div>
    </div>

    <!-- blank workspace → onboarding IS the empty state -->
    <div
      v-else-if="isBlankWorkspace"
      class="flex flex-col items-center gap-6 rounded-2xl border border-dashed px-6 py-14 text-center"
    >
      <span
        class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon name="map-pin" :size="22" />
      </span>
      <div>
        <h2 class="text-base font-semibold">Drop your first pin</h2>
        <p class="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Pins are comments anchored to real elements on your live site.
          They show up here the moment you drop one.
        </p>
      </div>
      <ol class="flex flex-col gap-3 text-left text-sm">
        <li class="flex items-center gap-3">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px]">1</span>
          Install the pinlay extension
        </li>
        <li class="flex items-center gap-3">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px]">2</span>
          Open your site and click the pinlay icon
        </li>
        <li class="flex items-center gap-3">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px]">3</span>
          Click anywhere on the page to drop a pin
        </li>
      </ol>
      <RouterLink to="/connect-extension">
        <Button class="rounded-full">
          <Icon name="puzzle" :size="15" /> Set up the extension
        </Button>
      </RouterLink>
    </div>

    <!-- filtered empty -->
    <div
      v-else-if="pins.length === 0"
      class="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center"
    >
      <Icon name="search-x" :size="20" class="text-muted-foreground" />
      <p class="text-sm text-muted-foreground">No pins match these filters.</p>
    </div>

    <!-- grouped inset lists -->
    <div v-else class="flex flex-col gap-6">
      <section v-for="group in groups" :key="group.label">
        <h2 class="mb-2 px-1 text-[13px] font-semibold text-muted-foreground">
          {{ group.label }}
        </h2>
        <div class="overflow-hidden rounded-2xl border bg-card">
          <RouterLink
            v-for="(pin, i) in group.pins"
            :key="pin.id"
            :to="`/p/${pin.id}`"
            class="group flex min-h-[72px] items-center gap-3 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-muted/60"
            :class="i > 0 ? 'border-t border-border/60' : ''"
          >
            <!-- thumb or placeholder -->
            <span
              class="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/50"
            >
              <img
                v-if="firstImage(pin)"
                :src="firstImage(pin)!.url"
                :alt="pin.title"
                loading="lazy"
                class="size-full object-cover"
              />
              <Icon
                v-else
                name="map-pin"
                :size="16"
                class="text-muted-foreground/50"
              />
              <span
                v-if="pin.attachments.length > 1"
                class="absolute bottom-0.5 right-0.5 rounded bg-background/90 px-1 font-mono text-[9px] text-muted-foreground"
                >{{ pin.attachments.length }}</span
              >
            </span>

            <!-- title + where -->
            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span
                class="truncate text-[15px] font-medium leading-tight"
                :class="
                  pin.status === 'resolved'
                    ? 'text-muted-foreground line-through decoration-border'
                    : 'text-foreground'
                "
              >
                {{ pin.title || "(no comment)" }}
              </span>
              <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Favicon
                  :label="(hostPath(pin.pageUrl).host.replace(/^www\./, '')[0] ?? '?').toUpperCase()"
                  :hue="hashHue(hostPath(pin.pageUrl).host)"
                  :size="13"
                />
                <span class="truncate">
                  {{ hostPath(pin.pageUrl).host }}<span class="opacity-60">{{ hostPath(pin.pageUrl).path }}</span>
                </span>
                <span
                  v-if="pin.status === 'in_progress'"
                  class="inline-flex shrink-0 items-center gap-1"
                  :style="{ color: STATUS_COLOR.in_progress }"
                >
                  <span class="size-1.5 rounded-full" :style="{ background: STATUS_COLOR.in_progress }" />
                  In progress
                </span>
                <span class="shrink-0 opacity-70">· {{ timeAgo(pin.createdAt) }}</span>
              </span>
            </span>

            <!-- reporter — hidden on narrow screens so the Resolve action
                 keeps breathing room -->
            <UserAvatar
              v-if="pin.author"
              :name="pin.author.name"
              :avatar-url="pin.author.avatarUrl"
              :hue="hashHue(pin.author.id)"
              :size="24"
              class="hidden shrink-0 sm:block"
            />

            <!-- Labeled resolve action — an unlabeled circle read as
                 decoration (user feedback 2026-07-12). @click.prevent.stop
                 so tapping it never follows the row link. -->
            <Button
              v-if="pin.status !== 'resolved'"
              variant="tinted"
              size="sm"
              class="min-h-[36px] shrink-0 rounded-full"
              :disabled="pendingId === pin.id"
              :aria-label="`Resolve ${pin.title}`"
              @click.prevent.stop="toggleResolve(pin)"
            >
              <Icon
                v-if="pendingId === pin.id"
                name="loader-circle"
                :size="14"
                class="animate-spin"
              />
              <Icon v-else name="check" :size="14" />
              Resolve
            </Button>
            <Button
              v-else
              variant="ghost"
              size="sm"
              class="min-h-[36px] shrink-0 rounded-full text-muted-foreground"
              :disabled="pendingId === pin.id"
              :aria-label="`Re-open ${pin.title}`"
              @click.prevent.stop="toggleResolve(pin)"
            >
              <Icon
                v-if="pendingId === pin.id"
                name="loader-circle"
                :size="14"
                class="animate-spin"
              />
              <Icon v-else name="rotate-ccw" :size="14" />
              Re-open
            </Button>
          </RouterLink>
        </div>
      </section>

      <Button
        v-if="query.hasNextPage.value"
        variant="outline"
        class="min-h-[44px] rounded-full"
        :disabled="query.isFetchingNextPage.value"
        @click="query.fetchNextPage()"
      >
        <Icon
          v-if="query.isFetchingNextPage.value"
          name="loader-circle"
          :size="14"
          class="animate-spin"
        />
        Load more
      </Button>
    </div>
  </div>
</template>
