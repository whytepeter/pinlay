<!--
  DetailsList — fetch a single record by id, with the same loading / error /
  retry / empty contract as QueryList. Use it for an issue (session) detail,
  a single pin, a workspace, etc.

  Slots (all optional):
    #default="{ data, refetch, isFetching }"  the happy path
    #loading                                   first-load placeholder
    #error="{ error, retry, isRetrying, failureCount }"
    #empty                                     query resolved to null/undefined
    #refetching                                background-refetch bar

  Exposed: refetch, data, isFetching.
-->
<script setup lang="ts" generic="T">
import { computed, type MaybeRefOrGetter, toValue } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Button, Icon, Skeleton } from "@pinlay/design";

const props = withDefaults(
  defineProps<{
    queryKey: MaybeRefOrGetter<readonly unknown[]>;
    queryFn: (ctx: { signal: AbortSignal }) => Promise<T>;
    enabled?: boolean;
    /** Treat a resolved value as "empty" (default: null/undefined). */
    isEmpty?: (data: T) => boolean;
  }>(),
  {
    enabled: true,
    isEmpty: (data: T) => data == null,
  },
);

const query = useQuery<T, Error>({
  queryKey: computed(() => [...toValue(props.queryKey)]),
  queryFn: ({ signal }) => props.queryFn({ signal }),
  enabled: computed(() => props.enabled),
});

const data = computed(() => query.data.value);
const isPending = computed(() => query.isPending.value);
const isError = computed(() => query.isError.value);
const error = computed(() => query.error.value);
const isFetching = computed(() => query.isFetching.value);
const failureCount = computed(() => query.failureCount.value);
const isRetrying = computed(() => isFetching.value && failureCount.value > 0);
const isRefetching = computed(() => isFetching.value && !isPending.value);
const empty = computed(
  () =>
    !isPending.value &&
    !isError.value &&
    (data.value === undefined || props.isEmpty(data.value as T)),
);

function retry() {
  void query.refetch();
}

defineExpose({ refetch: retry, data, isFetching });
</script>

<template>
  <div class="contents">
    <template v-if="isPending">
      <slot name="loading">
        <div class="flex flex-col gap-3">
          <Skeleton class="h-7 w-2/3 rounded-md" />
          <Skeleton class="h-4 w-1/3 rounded-md" />
          <Skeleton class="h-40 w-full rounded-lg" />
        </div>
      </slot>
    </template>

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
            <p class="text-sm font-medium text-foreground">Couldn’t load this</p>
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

    <template v-else-if="empty">
      <slot name="empty">
        <div
          class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center"
        >
          <Icon name="search-x" :size="22" class="text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Not found.</p>
        </div>
      </slot>
    </template>

    <template v-else>
      <slot
        v-if="isRefetching"
        name="refetching"
      >
        <div
          class="mb-2 flex items-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          <Icon name="refresh-cw" :size="12" class="animate-spin" />
          Updating…
        </div>
      </slot>
      <slot :data="(data as T)" :refetch="retry" :is-fetching="isFetching" />
    </template>
  </div>
</template>
