<script setup lang="ts">
/**
 * Pin detail — /p/:pinId. The dashboard's only detail surface after the
 * 2026-07-10 rebuild. Priorities, in order:
 *   1. "Open on page" is the single loud primary action (it IS the wedge).
 *   2. The screenshot + comment are the content; everything else is quiet.
 *   3. Anchor forensics live behind a closed-by-default "Developer details"
 *      disclosure — the visible trust signal is the status of the pin only.
 */
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import type { DisplayStatus, Status } from "@pinlay/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Skeleton,
} from "@pinlay/design";
import { apiClient, type MemberRef } from "@/shared/lib/api";
import { confirm } from "@/shared/lib/confirm";
import { toast } from "@/shared/lib/toast";
import { firstName, timeAgo } from "@/shared/lib/format";
import { hashHue } from "@/shared/lib/issue-display";
import { useAuth } from "@/shared/composables/useAuth";
import { usePinDetail } from "./composables/usePins";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import PinPill from "@/shared/components/PinPill.vue";
import ScreenshotViewer from "./components/ScreenshotViewer.vue";
import AnchorBlock from "./components/AnchorBlock.vue";
import ActivityThread from "./components/ActivityThread.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuth();

const pinId = computed(() => String(route.params.pinId ?? ""));
const { query, setStatus, setAssignee, remove } = usePinDetail(pinId);
const pin = computed(() => query.data.value ?? null);

// Workspace members feed the assignee dropdown.
const membersQuery = useQuery({
  queryKey: ["workspace", "members"],
  queryFn: () => apiClient.workspaces.members(),
});
const members = computed(() => membersQuery.data.value ?? []);

const STATUS: Record<DisplayStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "var(--status-open)" },
  in_progress: { label: "In progress", color: "var(--status-progress)" },
  resolved: { label: "Resolved", color: "var(--status-resolved)" },
};
const STATUS_OPTIONS: DisplayStatus[] = ["open", "in_progress", "resolved"];
const statusInfo = computed(
  () => STATUS[(pin.value?.status ?? "open") as DisplayStatus] ?? STATUS.open,
);
const isResolved = computed(() => pin.value?.status === "resolved");

// First line is the title; the rest renders as body copy.
const body = computed(() => {
  const c = pin.value?.comment ?? "";
  const t = pin.value?.title ?? "";
  if (!c) return "";
  if (t && c.startsWith(t)) {
    return c.slice(t.length).replace(/^\s*\n+/, "").trim();
  }
  return c;
});

const canDelete = computed(() => {
  const me = auth.user.value;
  if (!me || !pin.value) return false;
  if (pin.value.author?.id === me.id) return true;
  return me.role === "admin" || me.role === "owner";
});

const devDetailsOpen = ref(false);

function openOnPage() {
  if (!pin.value) return;
  // #pinlay-pin deep-link — the content script scrolls-to + flashes the pin
  // once Roadmap 3.1 lands; harmless as a plain anchor until then.
  const url = new URL(pin.value.pageUrl);
  url.hash = `pinlay-pin=${pin.value.id}`;
  window.open(url.toString(), "_blank", "noopener");
}

function copyLink() {
  try {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied");
  } catch {
    /* clipboard unavailable */
  }
}

function onDelete() {
  void confirm({
    title: "Delete this pin?",
    message: "The pin and its comments are permanently removed.",
    confirmLabel: "Delete pin",
    variant: "destructive",
    onConfirm: async () => {
      await remove.mutateAsync();
      void router.push("/");
    },
  });
}

function onSetAssignee(m: MemberRef | null) {
  setAssignee(m?.id ?? null);
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background text-foreground">
    <!-- top bar — same frosted language as the app navbar -->
    <header
      class="sticky top-0 z-10 flex h-[52px] shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur-xl"
      style="padding-top: env(safe-area-inset-top)"
    >
      <RouterLink to="/">
        <Button variant="ghost" size="sm" class="min-h-[40px]">
          <Icon name="arrow-left" :size="15" /> Pins
        </Button>
      </RouterLink>

      <div class="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="min-h-[40px] min-w-[40px]" title="More">
              <Icon name="ellipsis" :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="copyLink">
              <Icon name="link" :size="14" /> Copy link
            </DropdownMenuItem>
            <template v-if="canDelete">
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="text-destructive focus:bg-destructive/10 focus:text-destructive"
                @click="onDelete"
              >
                <Icon name="trash-2" :size="14" /> Delete pin
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" class="min-h-[40px]" :disabled="!pin" @click="openOnPage">
          <Icon name="square-arrow-out-up-right" :size="14" />
          <span class="hide-mobile">Open on page</span>
        </Button>
      </div>
    </header>

    <!-- loading -->
    <div v-if="query.isPending.value" class="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
      <Skeleton class="mb-3 h-6 w-2/3" />
      <Skeleton class="mb-6 h-4 w-1/3" />
      <Skeleton class="aspect-[16/9] w-full rounded-lg" />
    </div>

    <!-- error / gone -->
    <div
      v-else-if="query.isError.value || !pin"
      class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <Icon name="map-pin-off" :size="22" class="text-muted-foreground" />
      <p class="text-sm text-muted-foreground">
        This pin doesn't exist or was deleted.
      </p>
      <RouterLink to="/">
        <Button variant="outline" size="sm">Back to Pins</Button>
      </RouterLink>
    </div>

    <!-- content -->
    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <div
        class="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 pt-6 sm:px-6"
        style="padding-bottom: calc(2.5rem + env(safe-area-inset-bottom))"
      >
        <!-- title + meta -->
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <PinPill :n="pin.index" />
            <span class="text-xs text-muted-foreground">
              {{ pin.author ? firstName(pin.author.name) : "Someone" }}
              · {{ timeAgo(pin.createdAt) }}
            </span>
            <a
              :href="pin.pageUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              <Icon name="globe" :size="12" class="shrink-0" />
              <span class="truncate">{{ pin.pageUrl.replace(/^https?:\/\//, "") }}</span>
            </a>
          </div>
          <h1 class="text-lg font-semibold leading-tight tracking-tight">
            {{ pin.title || "(no comment)" }}
          </h1>
          <p
            v-if="body"
            class="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
          >{{ body }}</p>
        </div>

        <!-- status + assignee — quiet controls, 44px touch height -->
        <div class="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="min-h-[40px] gap-1.5">
                <span
                  class="size-1.5 shrink-0 rounded-full"
                  :style="{ background: statusInfo.color }"
                />
                {{ statusInfo.label }}
                <Icon name="chevron-down" :size="13" class="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                v-for="o in STATUS_OPTIONS"
                :key="o"
                @click="setStatus(o as Status)"
              >
                <span
                  class="size-1.5 shrink-0 rounded-full"
                  :style="{ background: STATUS[o].color }"
                />
                {{ STATUS[o].label }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm" class="min-h-[40px] gap-1.5">
                <UserAvatar
                  v-if="pin.assignee"
                  :name="pin.assignee.name"
                  :avatar-url="pin.assignee.avatarUrl"
                  :hue="hashHue(pin.assignee.id)"
                  :size="18"
                />
                <Icon v-else name="user-plus" :size="14" />
                {{ pin.assignee ? firstName(pin.assignee.name) : "Assign" }}
                <Icon name="chevron-down" :size="13" class="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem v-if="pin.assignee" @click="onSetAssignee(null)">
                <Icon name="user-minus" :size="14" /> Unassign
              </DropdownMenuItem>
              <DropdownMenuItem
                v-for="m in members"
                :key="m.id"
                @click="onSetAssignee({ id: m.userId, name: m.name, email: m.email, avatarUrl: m.avatarUrl })"
              >
                <UserAvatar
                  :name="m.name"
                  :avatar-url="m.avatarUrl"
                  :hue="hashHue(m.userId)"
                  :size="18"
                />
                {{ m.name }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            v-if="isResolved"
            variant="outline"
            size="sm"
            class="ml-auto min-h-[40px]"
            @click="setStatus('open')"
          >
            <Icon name="rotate-ccw" :size="14" /> Re-open
          </Button>
          <Button
            v-else
            variant="outline"
            size="sm"
            class="ml-auto min-h-[40px]"
            @click="setStatus('resolved')"
          >
            <Icon name="check" :size="14" /> Resolve
          </Button>
        </div>

        <ScreenshotViewer :pin="pin" />

        <!-- sibling pins from the same sitting — pills, not a panel -->
        <div v-if="pin.siblings.length > 0" class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs text-muted-foreground">
            {{ pin.siblings.length }} more pin{{ pin.siblings.length === 1 ? "" : "s" }} on this page:
          </span>
          <RouterLink
            v-for="s in pin.siblings"
            :key="s.id"
            :to="`/p/${s.id}`"
            class="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors hover:border-primary"
          >
            <span
              class="size-1.5 rounded-full"
              :style="{ background: STATUS[s.status as DisplayStatus]?.color ?? STATUS.open.color }"
            />
            <span class="max-w-[180px] truncate">#{{ String(s.index).padStart(2, "0") }} {{ s.title }}</span>
          </RouterLink>
        </div>

        <!-- Discussion — inset card like the list groups -->
        <div class="rounded-2xl border bg-card px-4 py-4">
          <ActivityThread :pin="pin" />
        </div>

        <!-- Developer details — collapsed by default. QA never needs this;
             a dev expands it when the anchor is in question. -->
        <div class="overflow-hidden rounded-2xl border bg-card">
          <button
            type="button"
            class="flex min-h-[48px] w-full items-center gap-2 px-4 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
            :aria-expanded="devDetailsOpen"
            @click="devDetailsOpen = !devDetailsOpen"
          >
            <Icon
              name="chevron-right"
              :size="14"
              class="transition-transform duration-200"
              :class="devDetailsOpen ? 'rotate-90' : ''"
            />
            Developer details
            <span class="ml-auto font-mono text-[11px] opacity-60">anchor</span>
          </button>
          <div v-if="devDetailsOpen" class="border-t border-border/60 p-4">
            <AnchorBlock v-if="pin.anchor" :anchor="pin.anchor" :stale="pin.stale" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
