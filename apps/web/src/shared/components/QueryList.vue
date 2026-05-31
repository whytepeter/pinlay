<!--
  QueryList — the one list primitive for the dashboard.
  ────────────────────────────────────────────────────
  Wraps TanStack Query and owns every non-happy state so feature code never
  re-implements loading / error / retry / empty / pagination. Use it for
  issues, pins, members, anything that's "fetch a page of things".

  Three modes (prop `mode`):
    • "load-more" (default) — useInfiniteQuery + a "Load more" button.
    • "infinite"            — useInfiniteQuery + auto-fetch when a sentinel
                              scrolls into view.
    • "paged"               — useQuery with prev/next page controls
                              (keepPreviousData so the list doesn't flash).

  The API page shape defaults to `{ items, total, limit, offset }` (our API),
  but `selectItems` / `selectTotal` let you adapt any response.

  Slots (all optional — sensible defaults provided):
    #default="{ items, ...ctx }"  full control: render the list yourself
    #item="{ item, index }"       convenience: rendered per item if #default
                                   is not supplied
    #loading                      first-load placeholder (default: skeletons)
    #error="{ error, retry, isRetrying, failureCount }"
    #empty                        no items, no error
    #refetching                   thin bar shown during background refetch
    #load-more="{ fetchNext, isFetchingNext, hasNext }"
    #pagination="{ page, pageCount, total, next, prev, setPage, isFetching }"

  Exposed (ref on the component) — refetch, fetchNext, next, prev, setPage,
  page, items — so a parent can drive it imperatively (toolbar refresh, etc).
-->
<script setup lang="ts" generic="TItem, TPage = { items: TItem[]; total: number }">
import { computed, ref, toValue, watch, onBeforeUnmount, type MaybeRefOrGetter } from "vue";
import {
  useInfiniteQuery,
  useQuery,
  keepPreviousData,
  type InfiniteData,
} from "@tanstack/vue-query";
import { Button, Icon, Skeleton } from "@pinlay/design";

export interface QueryListFetchContext {
  /** Offset for the requested page (0-based item offset). */
  pageParam: number;
  signal: AbortSignal;
}

const props = withDefaults(
  defineProps<{
    /** Base query key; the page offset is appended internally for "paged". */
    queryKey: MaybeRefOrGetter<readonly unknown[]>;
    /** Fetches one page. Receives `{ pageParam (offset), signal }`. */
    queryFn: (ctx: QueryListFetchContext) => Promise<TPage>;
    mode?: "load-more" | "infinite" | "paged";
    pageSize?: number;
    enabled?: boolean;
    /** Pull the item array out of a page. Default: `page.items`. */
    selectItems?: (page: TPage) => TItem[];
    /** Total count for pagination math. Default: `page.total`. */
    selectTotal?: (page: TPage) => number | undefined;
    /** Stable key per row. Default: `item.id ?? index`. */
    itemKey?: (item: TItem, index: number) => string | number;
    /** Layout wrapper class for the default item loop. */
    listClass?: string;
    /** How many skeleton rows to show on first load. */
    skeletonCount?: number;
  }>(),
  {
    mode: "load-more",
    pageSize: 20,
    enabled: true,
    selectItems: (page: TPage) =>
      (page as unknown as { items: TItem[] }).items ?? [],
    selectTotal: (page: TPage) =>
      (page as unknown as { total?: number }).total,
    itemKey: (item: TItem, index: number) =>
      (item as unknown as { id?: string | number }).id ?? index,
    listClass: "flex flex-col gap-2",
    skeletonCount: 5,
  },
);

const isPaged = props.mode === "paged";

// ── Paged-mode page cursor ───────────────────────────────────────────────────
const page = ref(0);

// ── Queries (exactly one is created; `mode` is structural, never changes) ─────
const pagedQuery = isPaged
  ? useQuery<TPage, Error>({
      queryKey: computed(() => [...toValue(props.queryKey), "page", page.value]),
      queryFn: ({ signal }) =>
        props.queryFn({ pageParam: page.value * props.pageSize, signal }),
      enabled: computed(() => props.enabled),
      placeholderData: keepPreviousData,
    })
  : null;

const infiniteQuery = !isPaged
  ? useInfiniteQuery<TPage, Error, InfiniteData<TPage>, readonly unknown[], number>({
      queryKey: computed(() => [...toValue(props.queryKey)]),
      queryFn: ({ pageParam, signal }) => props.queryFn({ pageParam, signal }),
      enabled: computed(() => props.enabled),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce(
          (n, p) => n + props.selectItems(p).length,
          0,
        );
        const total = props.selectTotal(lastPage);
        if (total != null && loaded >= total) return undefined;
        // No items in the last page → nothing more to load.
        if (props.selectItems(lastPage).length === 0) return undefined;
        return loaded;
      },
    })
  : null;

// ── Normalised, mode-agnostic surface ─────────────────────────────────────────
const items = computed<TItem[]>(() => {
  if (isPaged) {
    const data = pagedQuery!.data.value;
    return data ? props.selectItems(data) : [];
  }
  const data = infiniteQuery!.data.value;
  return data ? data.pages.flatMap((p) => props.selectItems(p)) : [];
});

const total = computed<number | undefined>(() => {
  const data = isPaged
    ? pagedQuery!.data.value
    : infiniteQuery!.data.value?.pages.at(-1);
  return data ? props.selectTotal(data) : undefined;
});

const q = isPaged ? pagedQuery! : infiniteQuery!;
const isPending = computed(() => q.isPending.value); // first load, no data yet
const isError = computed(() => q.isError.value);
const error = computed(() => q.error.value);
const isFetching = computed(() => q.isFetching.value);
const failureCount = computed(() => q.failureCount.value);
// "Retrying" = a fetch is in flight AND at least one attempt already failed.
const isRetrying = computed(() => isFetching.value && failureCount.value > 0);

const isEmpty = computed(
  () => !isPending.value && !isError.value && items.value.length === 0,
);
// Background refetch over already-rendered data (not first load, not next page).
const isRefetching = computed(
  () => isFetching.value && !isPending.value && !isFetchingNext.value,
);

// Infinite-only bits
const hasNext = computed(() =>
  isPaged ? false : (infiniteQuery!.hasNextPage.value ?? false),
);
const isFetchingNext = computed(() =>
  isPaged ? false : infiniteQuery!.isFetchingNextPage.value,
);

// Paged-only bits
const pageCount = computed(() =>
  total.value != null ? Math.max(1, Math.ceil(total.value / props.pageSize)) : 1,
);

// ── Actions ───────────────────────────────────────────────────────────────────
function refetch() {
  void q.refetch();
}
/** Retry after an error — refetch from scratch. */
function retry() {
  void q.refetch();
}
function fetchNext() {
  if (!isPaged && hasNext.value && !isFetchingNext.value) {
    void infiniteQuery!.fetchNextPage();
  }
}
function setPage(n: number) {
  if (!isPaged) return;
  page.value = Math.max(0, Math.min(n, pageCount.value - 1));
}
function next() {
  setPage(page.value + 1);
}
function prev() {
  setPage(page.value - 1);
}

// When the query key changes (e.g. filters), reset paged cursor to page 0.
watch(
  () => JSON.stringify(toValue(props.queryKey)),
  () => {
    if (isPaged) page.value = 0;
  },
);

// ── Infinite auto-fetch sentinel ──────────────────────────────────────────────
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
watch(
  () => [props.mode, sentinel.value] as const,
  ([mode, el]) => {
    observer?.disconnect();
    observer = null;
    if (mode !== "infinite" || !el || typeof IntersectionObserver === "undefined")
      return;
    observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) fetchNext();
    });
    observer.observe(el);
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(() => observer?.disconnect());

// Context handed to the default slot + exposed.
const ctx = computed(() => ({
  items: items.value,
  total: total.value,
  isPending: isPending.value,
  isFetching: isFetching.value,
  isError: isError.value,
  error: error.value,
  hasNext: hasNext.value,
  isFetchingNext: isFetchingNext.value,
  page: page.value,
  pageCount: pageCount.value,
  refetch,
  fetchNext,
  next,
  prev,
  setPage,
}));

defineExpose({
  refetch,
  fetchNext,
  next,
  prev,
  setPage,
  page,
  items,
  total,
});
</script>

<template>
  <div class="contents">
    <!-- FIRST LOAD ──────────────────────────────────────────────────────── -->
    <template v-if="isPending">
      <slot name="loading">
        <div :class="listClass">
          <Skeleton
            v-for="i in skeletonCount"
            :key="i"
            class="h-16 w-full rounded-lg"
          />
        </div>
      </slot>
    </template>

    <!-- HARD ERROR (no data to show) ──────────────────────────────────────── -->
    <template v-else-if="isError">
      <slot
        name="error"
        :error="error"
        :retry="retry"
        :is-retrying="isRetrying"
        :failure-count="failureCount"
      >
        <div
          class="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          >
            <Icon name="alert-triangle" :size="20" :stroke-width="2" />
          </span>
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-foreground">
              Couldn’t load this list
            </p>
            <p class="max-w-sm text-xs text-muted-foreground">
              {{ error?.message || "Something went wrong." }}
            </p>
          </div>
          <Button size="sm" variant="outline" :disabled="isFetching" @click="retry">
            <Icon
              name="refresh-cw"
              :size="14"
              :class="isFetching && 'animate-spin'"
            />
            {{ isRetrying ? "Retrying…" : "Try again" }}
          </Button>
        </div>
      </slot>
    </template>

    <!-- EMPTY ─────────────────────────────────────────────────────────────── -->
    <template v-else-if="isEmpty">
      <slot name="empty">
        <div
          class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center"
        >
          <Icon name="inbox" :size="22" class="text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Nothing here yet.</p>
        </div>
      </slot>
    </template>

    <!-- DATA ──────────────────────────────────────────────────────────────── -->
    <template v-else>
      <!-- Thin background-refetch indicator -->
      <slot v-if="isRefetching" name="refetching">
        <div
          class="mb-2 flex items-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          <Icon name="refresh-cw" :size="12" class="animate-spin" />
          Updating…
        </div>
      </slot>

      <!-- List body: #default wins; else loop #item; else nothing -->
      <slot v-bind="ctx" :retry="retry">
        <div :class="listClass">
          <template v-for="(item, index) in items" :key="itemKey(item, index)">
            <slot name="item" :item="item" :index="index" />
          </template>
        </div>
      </slot>

      <!-- LOAD MORE (infinite + load-more) ─────────────────────────────────── -->
      <template v-if="!isPaged && hasNext">
        <slot
          name="load-more"
          :fetch-next="fetchNext"
          :is-fetching-next="isFetchingNext"
          :has-next="hasNext"
        >
          <div class="mt-4 flex justify-center">
            <Button
              v-if="mode === 'load-more'"
              variant="outline"
              size="sm"
              :disabled="isFetchingNext"
              @click="fetchNext"
            >
              <Icon
                v-if="isFetchingNext"
                name="loader-2"
                :size="14"
                class="animate-spin"
              />
              {{ isFetchingNext ? "Loading…" : "Load more" }}
            </Button>
          </div>
        </slot>
        <!-- Auto-fetch sentinel for infinite mode -->
        <div
          v-if="mode === 'infinite'"
          ref="sentinel"
          aria-hidden="true"
          class="h-px w-full"
        />
      </template>

      <!-- Inline next-page error (data already shown) -->
      <div
        v-if="!isPaged && isError"
        class="mt-3 flex items-center justify-center gap-2 text-xs text-destructive"
      >
        <span>Couldn’t load more.</span>
        <button class="underline underline-offset-2" @click="fetchNext">
          Retry
        </button>
      </div>

      <!-- PAGINATION (paged) ───────────────────────────────────────────────── -->
      <template v-if="isPaged && pageCount > 1">
        <slot
          name="pagination"
          :page="page"
          :page-count="pageCount"
          :total="total"
          :next="next"
          :prev="prev"
          :set-page="setPage"
          :is-fetching="isFetching"
        >
          <div class="mt-4 flex items-center justify-between gap-3">
            <span class="text-xs text-muted-foreground">
              Page {{ page + 1 }} of {{ pageCount }}
              <template v-if="total != null">· {{ total }} total</template>
            </span>
            <div class="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                :disabled="page === 0 || isFetching"
                @click="prev"
              >
                <Icon name="chevron-left" :size="14" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="page >= pageCount - 1 || isFetching"
                @click="next"
              >
                Next
                <Icon name="chevron-right" :size="14" />
              </Button>
            </div>
          </div>
        </slot>
      </template>
    </template>
  </div>
</template>
