<script setup lang="ts">
import { Button, Icon } from "@pinlayer/design";
import PageHeader from "@/shared/components/PageHeader.vue";
import { PEOPLE } from "@/shared/lib/data";
import { useSessions } from "./composables/useSessions";
import SessionFilters from "./components/SessionFilters.vue";
import SessionCard from "./components/SessionCard.vue";
import SessionRow from "./components/SessionRow.vue";
import EmptyState from "./components/EmptyState.vue";

const { status, severity, assignee, query, sort, view, counts, filtered } =
  useSessions();
</script>

<template>
  <div>
    <PageHeader
      title="Pinboards"
      :badge="`${counts.open} open`"
      subtitle="Every annotation session, grouped by page."
    >
      <template #actions>
        <Button variant="outline">
          <Icon name="refresh-cw" :size="14" /> Sync now
        </Button>
        <Button><Icon name="plus" :size="14" /> New session</Button>
      </template>
    </PageHeader>

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
