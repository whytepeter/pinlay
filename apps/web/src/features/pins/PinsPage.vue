<script setup lang="ts">
/**
 * The Pin Inbox — the dashboard's home. One reverse-chron list of pins,
 * three state chips, a site filter, and search. Deliberately NOT a project
 * board: no severity matrices, no counts dashboards, no board columns
 * (product decision 2026-07-10 — see ROADMAP.md "Product principles").
 */
import { computed, ref } from "vue";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  Icon,
  Input,
  Skeleton,
  DropdownMenuTrigger,
} from "@pinlay/design";
import type { InboxState } from "@/shared/lib/api";
import { timeAgo } from "@/shared/lib/format";
import { hashHue } from "@/shared/lib/issue-display";
import { usePinInbox } from "./composables/usePins";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import Favicon from "@/shared/components/Favicon.vue";

const state = ref<InboxState>("open");
const site = ref<string | null>(null);
const q = ref("");

const { query, pins, total, sites } = usePinInbox({ state, site, q });

const STATE_CHIPS: { value: InboxState; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

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

function hostPath(pageUrl: string): { host: string; path: string } {
  try {
    const u = new URL(pageUrl);
    return { host: u.host, path: u.pathname === "/" ? "" : u.pathname };
  } catch {
    return { host: pageUrl, path: "" };
  }
}

function firstImage(pin: { attachments: { url: string; contentType: string }[] }) {
  return (
    pin.attachments.find((a) => a.contentType.startsWith("image/")) ?? null
  );
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-6">
    <!-- header -->
    <div class="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">Pins</h1>
        <p class="mt-0.5 text-sm text-muted-foreground">
          {{ total }} {{ state === "all" ? "" : state }}
          pin{{ total === 1 ? "" : "s" }}
          {{ site ? `on ${site}` : "across your sites" }}
        </p>
      </div>
    </div>

    <!-- filters — 44px touch targets, wrap on narrow screens -->
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1 rounded-lg bg-muted p-1">
        <button
          v-for="chip in STATE_CHIPS"
          :key="chip.value"
          type="button"
          class="min-h-[36px] rounded-md px-3 text-[13px] font-medium transition-colors"
          :class="
            state === chip.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="state = chip.value"
        >
          {{ chip.label }}
        </button>
      </div>

      <DropdownMenu v-if="(sites.data.value?.length ?? 0) > 1">
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="min-h-[36px] gap-1.5">
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
            <span class="font-mono text-[11px] text-muted-foreground">{{
              s.count
            }}</span>
            <Icon v-if="site === s.host" name="check" :size="14" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div class="relative ml-auto w-full sm:w-56">
        <Icon
          name="search"
          :size="14"
          class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <!-- text-base on mobile stops iOS Safari zooming the page on focus -->
        <Input
          v-model="q"
          placeholder="Search pins"
          class="h-9 pl-8 text-base sm:text-sm"
        />
      </div>
    </div>

    <!-- loading -->
    <div v-if="query.isPending.value" class="flex flex-col gap-2">
      <div
        v-for="i in 6"
        :key="i"
        class="flex items-center gap-3 rounded-lg border p-3"
      >
        <Skeleton class="size-12 shrink-0 rounded-md" />
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton class="h-4 w-3/5" />
          <Skeleton class="h-3 w-2/5" />
        </div>
      </div>
    </div>

    <!-- blank workspace → onboarding IS the empty state -->
    <div
      v-else-if="isBlankWorkspace"
      class="flex flex-col items-center gap-6 rounded-xl border border-dashed px-6 py-14 text-center"
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
        <Button>
          <Icon name="puzzle" :size="15" /> Set up the extension
        </Button>
      </RouterLink>
    </div>

    <!-- filtered empty -->
    <div
      v-else-if="pins.length === 0"
      class="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center"
    >
      <Icon name="search-x" :size="20" class="text-muted-foreground" />
      <p class="text-sm text-muted-foreground">No pins match these filters.</p>
    </div>

    <!-- the feed -->
    <div v-else class="flex flex-col gap-2">
      <RouterLink
        v-for="pin in pins"
        :key="pin.id"
        :to="`/p/${pin.id}`"
        class="group flex min-h-[64px] items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/50"
      >
        <!-- thumb or status placeholder -->
        <span
          class="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50"
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
        </span>

        <!-- title + where -->
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="truncate text-sm font-medium text-foreground">
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
          </span>
        </span>

        <!-- status dot · reporter · age -->
        <span class="flex shrink-0 items-center gap-2.5">
          <span
            class="size-2 rounded-full"
            :style="{ background: STATUS_COLOR[pin.status] ?? STATUS_COLOR.open }"
            :title="pin.status.replace('_', ' ')"
          />
          <UserAvatar
            v-if="pin.author"
            :name="pin.author.name"
            :avatar-url="pin.author.avatarUrl"
            :hue="hashHue(pin.author.id)"
            :size="22"
          />
          <span class="hidden w-14 text-right text-[11px] text-muted-foreground sm:block">
            {{ timeAgo(pin.createdAt) }}
          </span>
        </span>
      </RouterLink>

      <Button
        v-if="query.hasNextPage.value"
        variant="outline"
        class="mt-2 min-h-[44px]"
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
