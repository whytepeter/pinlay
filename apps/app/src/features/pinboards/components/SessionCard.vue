<script setup lang="ts">
import { computed } from "vue";
import type { DisplayStatus } from "@pinlayer/shared";
import { personById, type SessionListItem } from "@/shared/lib/data";
import { firstName, timeAgo } from "@/shared/lib/format";
import { sevBg, topSeverity } from "@/shared/lib/severity";
import Favicon from "@/shared/components/Favicon.vue";
import SeverityHeatbar from "@/shared/components/SeverityHeatbar.vue";
import StatusChip from "@/shared/components/StatusChip.vue";
import SyncChip from "@/shared/components/SyncChip.vue";
import UserAvatar from "@/shared/components/UserAvatar.vue";

const props = defineProps<{ session: SessionListItem }>();

const reporter = computed(() => personById(props.session.reporterId));
const top = computed(() => topSeverity(props.session.severityCounts));
const ago = computed(() => timeAgo(props.session.updatedAt));
const status = computed(() => props.session.status as DisplayStatus);
</script>

<template>
  <RouterLink
    :to="`/s/${session.id}`"
    class="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-150 hover:bg-muted/50"
  >
    <span class="absolute inset-y-0 left-0 w-[3px]" :class="sevBg[top]" />

    <div class="flex flex-col gap-2.5 p-4 pl-5">
      <div class="flex items-center gap-2">
        <Favicon
          :label="session.faviconLabel"
          :hue="session.faviconHue"
          :size="16"
        />
        <span class="font-mono text-[11px] font-medium text-muted-foreground">{{
          session.shortId
        }}</span>
        <span class="truncate font-mono text-[11px] text-muted-foreground">{{
          session.urlPath
        }}</span>
        <StatusChip class="ml-auto shrink-0" :status="status" />
      </div>

      <h3 class="line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {{ session.title }}
      </h3>

      <SeverityHeatbar :counts="session.severityCounts" />
    </div>

    <div
      class="mt-auto flex items-center gap-2.5 border-t bg-muted/30 px-4 py-2.5 pl-5"
    >
      <UserAvatar :name="reporter.name" :hue="reporter.avatarHue" :size="20" />
      <span class="text-xs font-medium text-foreground">{{
        firstName(reporter.name)
      }}</span>
      <span class="text-xs text-muted-foreground">· {{ ago }}</span>
      <div class="ml-auto flex items-center gap-2.5">
        <span
          class="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
          >{{ session.pinCount }} pins</span
        >
        <SyncChip
          v-if="session.integration"
          :name="session.integration.name"
          :count="session.integration.count"
          :state="session.integration.state"
        />
      </div>
    </div>
  </RouterLink>
</template>
