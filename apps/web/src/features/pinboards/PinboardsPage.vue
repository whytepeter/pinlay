<script setup lang="ts">
import { computed, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { Button, Icon } from "@pinlay/design";
import PageHeader from "@/shared/components/PageHeader.vue";
import { apiClient } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import { useBoards } from "@/shared/composables/useBoards";
import { useSessions } from "./composables/useSessions";
import SessionFilters from "./components/SessionFilters.vue";
import SessionCard from "./components/SessionCard.vue";
import SessionRow from "./components/SessionRow.vue";
import SessionCardSkeleton from "./components/SessionCardSkeleton.vue";
import SessionRowSkeleton from "./components/SessionRowSkeleton.vue";
import EmptyState from "./components/EmptyState.vue";

const {
  status,
  severity,
  assignee,
  query,
  sort,
  view,
  counts,
  filtered,
  page,
  pageSize,
  total,
  totalPages,
  hasPrev,
  hasNext,
  nextPage,
  prevPage,
  isPending,
  isFetching,
  isError,
  refetch,
} = useSessions();

// Workspace members feed the assignee filter dropdown. Pull them lazily so the
// first paint of the feed isn't blocked on this secondary query.
const membersQuery = useQuery({
  queryKey: ["workspace", "members"],
  queryFn: () => apiClient.workspaces.members(),
});

const people = computed(() =>
  (membersQuery.data.value ?? []).map((m) => ({ id: m.userId, name: m.name }))
);

// Toast on transient errors. Keep the in-page error block as a fallback so
// the user still sees a retry control if the toast is dismissed too early.
watch(
  () => isError.value,
  (errored) => {
    if (errored) toast.error("Couldn't load issues. Try again.");
  },
);

const { activeBoard } = useBoards();
const router = useRouter();

function clearBoard() {
  router.replace({ path: "/", query: {} });
}

// Scroll the feed to top whenever the page index changes so paging feels
// like a fresh load instead of a silent swap mid-scroll.
watch(page, async () => {
  await nextTick();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Page X of Y · N total — the badge in the page header.
const headerBadge = computed(() => {
  if (total.value === 0) return "0 total";
  const n = total.value;
  const noun = activeBoard.value
    ? "in board"
    : status.value === "all"
      ? "total"
      : status.value.replace("_", " ");
  return `${n} ${noun}`;
});

const showingFrom = computed(() => page.value * pageSize.value + 1);
const showingTo = computed(() =>
  Math.min(total.value, (page.value + 1) * pageSize.value),
);
</script>

<template>
  <div>
    <PageHeader
      :title="activeBoard ? activeBoard.name : 'Pinboards'"
      :badge="headerBadge"
      :subtitle="
        activeBoard
          ? 'Filtered to this board. Clear to see every session.'
          : 'Every annotation session, grouped by page.'
      "
    >
      <template #actions>
        <Button
          variant="outline"
          :disabled="isFetching"
          @click="() => refetch()"
        >
          <Icon
            name="rotate-cw"
            :size="14"
            :class="isFetching ? 'animate-spin' : ''"
          />
          <span class="sr-only sm:not-sr-only">Refresh</span>
        </Button>
      </template>
    </PageHeader>

    <!-- active board chip: lives between the header and the filter bar so it
         reads as a filter pill (not an action button) -->
    <div
      v-if="activeBoard"
      class="flex items-center gap-2 border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground sm:px-8"
    >
      <span>Filtered by</span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/70"
        @click="clearBoard"
      >
        <span
          class="size-1.5 rounded-full"
          :style="{ background: activeBoard.color }"
        />
        {{ activeBoard.name }}
        <Icon name="x" :size="11" class="text-muted-foreground" />
      </button>
    </div>

    <SessionFilters
      v-model:status="status"
      v-model:severity="severity"
      v-model:assignee="assignee"
      v-model:query="query"
      v-model:sort="sort"
      v-model:view="view"
      :counts="counts"
      :people="people"
    />

    <div class="p-4 sm:p-8">
      <!-- Skeleton state matches the chosen view so the layout doesn't
           shift when real data arrives. Mirrors the page-size of the
           query so the placeholder count looks plausible. -->
      <template v-if="isPending">
        <div
          v-if="view === 'grid'"
          class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]"
        >
          <SessionCardSkeleton v-for="i in 6" :key="`sk-${i}`" />
        </div>
        <div v-else class="overflow-hidden rounded-lg border bg-card">
          <SessionRowSkeleton v-for="i in 6" :key="`sk-${i}`" />
        </div>
      </template>

      <div
        v-else-if="isError"
        class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center"
      >
        <span
          class="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        >
          <Icon name="triangle-alert" :size="22" />
        </span>
        <p class="text-sm text-foreground">Couldn't load issues.</p>
        <Button variant="outline" size="sm" @click="refetch">Try again</Button>
      </div>

      <EmptyState v-else-if="filtered.length === 0" />

      <template v-else>
        <div
          v-if="view === 'grid'"
          class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]"
        >
          <SessionCard v-for="s in filtered" :key="s.id" :session="s" />
        </div>

        <div v-else class="overflow-hidden rounded-lg border bg-card">
          <SessionRow v-for="s in filtered" :key="s.id" :session="s" />
        </div>

        <!-- Pagination footer. Hidden when everything fits on one page so
             single-page workspaces don't see noise. -->
        <div
          v-if="totalPages > 1"
          class="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row"
        >
          <p class="text-xs text-muted-foreground">
            Showing
            <span class="font-mono font-medium text-foreground">{{ showingFrom }}–{{ showingTo }}</span>
            of
            <span class="font-mono font-medium text-foreground">{{ total }}</span>
          </p>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="!hasPrev || isFetching"
              @click="prevPage"
            >
              <Icon name="chevron-left" :size="14" /> Previous
            </Button>
            <span class="font-mono text-xs text-muted-foreground">
              Page {{ page + 1 }} of {{ totalPages }}
            </span>
            <Button
              variant="outline"
              size="sm"
              :disabled="!hasNext || isFetching"
              @click="nextPage"
            >
              Next <Icon name="chevron-right" :size="14" />
            </Button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
