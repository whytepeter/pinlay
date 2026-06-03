<script setup lang="ts">
import { computed } from "vue";
import type { DisplayStatus } from "@pinlay/shared";
import { Button, Icon } from "@pinlay/design";
import type { ApiPin, IssueSummary } from "@/shared/lib/api";
import { firstName, timeAgo } from "@/shared/lib/format";
import { issueDisplay } from "@/shared/lib/issue-display";
import StatusChip from "@/shared/components/StatusChip.vue";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import PinListItem from "./PinListItem.vue";

const props = defineProps<{
  session: IssueSummary;
  pins: ApiPin[];
  selectedIndex: number;
}>();
defineEmits<{ select: [number] }>();

const display = computed(() => issueDisplay(props.session));
const status = computed(() => props.session.status as DisplayStatus);
const reporterName = computed(
  () => props.session.reporter?.name ?? "Unknown reporter",
);
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- session meta -->
    <div class="flex flex-col gap-2.5 border-b p-4">
      <div class="flex items-center gap-2">
        <Icon name="globe" :size="14" class="shrink-0 text-muted-foreground" />
        <span class="truncate font-mono text-[11px] text-muted-foreground">{{
          session.pageUrl.replace(/^https?:\/\//, "")
        }}</span>
        <Button variant="ghost" size="icon-sm" class="ml-auto" title="Open URL">
          <Icon name="external-link" :size="13" />
        </Button>
      </div>
      <div class="flex items-center gap-2">
        <UserAvatar
          :name="reporterName"
          :hue="display.faviconHue"
          :size="20"
        />
        <span class="text-xs font-medium">{{ firstName(reporterName) }}</span>
        <span class="text-xs text-muted-foreground"
          >· {{ timeAgo(session.updatedAt) }}</span
        >
        <StatusChip class="ml-auto" :status="status" />
      </div>
    </div>

    <!-- filter row -->
    <div
      class="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground"
    >
      <span class="font-medium text-foreground">{{ pins.length }} pins</span>
      <span class="ml-auto">Sort: Severity</span>
      <Button variant="ghost" size="icon-sm" title="Filter">
        <Icon name="filter" :size="14" />
      </Button>
    </div>

    <!-- list -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <PinListItem
        v-for="(p, i) in pins"
        :key="p.id"
        :pin="p"
        :active="i === selectedIndex"
        @click="$emit('select', i)"
      />
    </div>

    <!-- footer -->
    <div class="border-t p-3">
      <Button variant="outline" size="sm" class="w-full">
        <Icon name="message-square-plus" :size="14" /> Add comment to session
      </Button>
    </div>
  </div>
</template>
