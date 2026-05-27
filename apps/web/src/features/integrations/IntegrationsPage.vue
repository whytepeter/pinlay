<script setup lang="ts">
import { ref, computed } from "vue";
import { Icon, Input, Tabs, TabsList, TabsTrigger } from "@pinlay/design";
import PageHeader from "@/shared/components/PageHeader.vue";
import { useIntegrations } from "./composables/useIntegrations";
import IntegrationCard from "./components/IntegrationCard.vue";

const { integrations, connectedCount } = useIntegrations();

const tab = ref<"all" | "connected" | "available">("all");

const tabOptions = computed(() => [
  { label: "All", value: "all", count: integrations.value.length },
  { label: "Connected", value: "connected", count: connectedCount.value },
  {
    label: "Available",
    value: "available",
    count: integrations.value.length - connectedCount.value,
  },
]);

const query = ref("");

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return integrations.value.filter((i) => {
    if (tab.value === "connected" && !i.connected) return false;
    if (tab.value === "available" && i.connected) return false;
    if (q && !i.name.toLowerCase().includes(q)) return false;
    return true;
  });
});
</script>

<template>
  <div>
    <PageHeader
      title="Integrations"
      :badge="`${connectedCount} connected`"
      subtitle="Route pins to the tools your team already lives in."
    />

    <!-- filter bar -->
    <div
      class="flex flex-col gap-3 border-b bg-bg-1 px-4 py-3 sm:flex-row sm:items-center sm:px-8"
    >
      <Tabs v-model="tab">
        <TabsList>
          <TabsTrigger
            v-for="t in tabOptions"
            :key="t.value"
            :value="t.value"
            class="gap-1.5 text-xs group"
          >
            {{ t.label }}
            <span
              class="font-mono text-[10px] opacity-70 group-data-[state=active]:text-primary group-data-[state=active]:opacity-100"
              >{{ t.count }}</span
            >
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div class="grow" />

      <div class="relative w-full sm:max-w-[240px]">
        <Icon
          name="search"
          :size="14"
          class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="query"
          placeholder="Search integrations…"
          class="pl-8"
        />
      </div>
    </div>

    <!-- grid -->
    <div class="p-4 sm:p-8">
      <div
        v-if="filtered.length"
        class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))]"
      >
        <IntegrationCard v-for="i in filtered" :key="i.id" :integration="i" />
      </div>
      <div
        v-else
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card py-12 text-sm text-muted-foreground"
      >
        <Icon name="search-x" :size="20" />
        No integrations match
        <span v-if="query" class="font-mono">"{{ query }}"</span>
        <span v-else>this filter</span>.
      </div>
    </div>
  </div>
</template>
