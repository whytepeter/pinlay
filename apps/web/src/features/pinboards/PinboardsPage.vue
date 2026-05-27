<script setup lang="ts">
import { useRouter } from "vue-router";
import { Button, Icon } from "@pinlay/design";
import PageHeader from "@/shared/components/PageHeader.vue";
import { PEOPLE } from "@/shared/lib/data";
import { useBoards } from "@/shared/composables/useBoards";
import { useSessions } from "./composables/useSessions";
import SessionFilters from "./components/SessionFilters.vue";
import SessionCard from "./components/SessionCard.vue";
import SessionRow from "./components/SessionRow.vue";
import EmptyState from "./components/EmptyState.vue";

const { status, severity, assignee, query, sort, view, counts, filtered } =
  useSessions();
const { activeBoard } = useBoards();
const router = useRouter();

function clearBoard() {
  router.replace({ path: "/", query: {} });
}
</script>

<template>
  <div>
    <PageHeader
      :title="activeBoard ? activeBoard.name : 'Pinboards'"
      :badge="`${filtered.length} ${activeBoard ? 'in board' : 'open'}`"
      :subtitle="
        activeBoard
          ? 'Filtered to this board. Clear to see every session.'
          : 'Every annotation session, grouped by page.'
      "
    >
      <template #actions>
        <Button variant="outline">
          <Icon name="refresh-cw" :size="14" /> Sync now
        </Button>
        <Button><Icon name="plus" :size="14" /> New session</Button>
      </template>
    </PageHeader>

    <!-- active board chip: lives between the header and the filter bar so it
         reads as a filter pill (not an action button) -->
    <div
      v-if="activeBoard"
      class="flex items-center gap-2 border-b bg-bg-1 px-4 py-2 text-xs text-muted-foreground sm:px-8"
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
      :people="PEOPLE"
    />

    <div class="p-4 sm:p-8">
      <EmptyState v-if="filtered.length === 0" />

      <div
        v-else-if="view === 'grid'"
        class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]"
      >
        <SessionCard v-for="s in filtered" :key="s.id" :session="s" />
      </div>

      <div v-else class="overflow-hidden rounded-lg border bg-card">
        <SessionRow v-for="s in filtered" :key="s.id" :session="s" />
      </div>
    </div>
  </div>
</template>
