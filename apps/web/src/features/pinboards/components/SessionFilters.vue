<script setup lang="ts">
import { computed } from "vue";
import {
  Icon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@pinlay/design";

const props = defineProps<{
  counts: {
    all: number;
    open: number;
    in_progress: number;
    resolved: number;
    archived: number;
  };
  people: Array<{ id: string; name: string }>;
}>();

const status = defineModel<string>("status");
const severity = defineModel<string>("severity");
const assignee = defineModel<string>("assignee");
const query = defineModel<string>("query");
const sort = defineModel<string>("sort");
const view = defineModel<string>("view");

const statusTabs = computed(() => [
  { label: "All", value: "all", count: props.counts.all },
  { label: "Open", value: "open", count: props.counts.open },
  {
    label: "In progress",
    value: "in_progress",
    count: props.counts.in_progress,
  },
  { label: "Resolved", value: "resolved", count: props.counts.resolved },
  { label: "Archived", value: "archived", count: props.counts.archived },
]);
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 border-b px-8 py-3 bg-bg-1">
    <!-- status tabs -->
    <Tabs v-model="status">
      <TabsList>
        <TabsTrigger
          v-for="t in statusTabs"
          :key="t.value"
          :value="t.value"
          class="group gap-1.5 text-xs"
        >
          {{ t.label }}
          <span
            class="font-mono text-[10px] opacity-70 group-data-[state=active]:text-primary group-data-[state=active]:opacity-100"
            >{{ t.count }}</span
          >
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div class="mx-1 hidden h-5 w-px bg-border sm:block" />

    <!-- severity -->
    <Select v-model="severity">
      <SelectTrigger class="w-[124px]">
        <SelectValue placeholder="Severity" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All severity</SelectItem>
        <SelectItem value="critical">Critical</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>

    <!-- assignee -->
    <Select v-model="assignee">
      <SelectTrigger class="w-[132px]">
        <SelectValue placeholder="Assignee" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All people</SelectItem>
        <SelectItem v-for="p in people" :key="p.id" :value="p.id">{{
          p.name
        }}</SelectItem>
      </SelectContent>
    </Select>

    <div class="grow" />

    <!-- search -->
    <div class="relative w-full max-w-[220px]">
      <Icon
        name="search"
        :size="14"
        class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input v-model="query" placeholder="Filter title or URL" class="pl-8" />
    </div>

    <!-- sort -->
    <Select v-model="sort">
      <SelectTrigger class="w-[128px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="recent">Most recent</SelectItem>
        <SelectItem value="severity">Severity</SelectItem>
        <SelectItem value="pins">Most pins</SelectItem>
      </SelectContent>
    </Select>

    <!-- view toggle -->
    <div class="inline-flex items-center rounded-md border bg-card p-0.5">
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-[5px] transition-colors"
        :class="
          view === 'grid'
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        title="Grid view"
        @click="view = 'grid'"
      >
        <Icon name="layout-grid" :size="15" />
      </button>
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-[5px] transition-colors"
        :class="
          view === 'list'
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        title="List view"
        @click="view = 'list'"
      >
        <Icon name="list" :size="15" />
      </button>
    </div>
  </div>
</template>
