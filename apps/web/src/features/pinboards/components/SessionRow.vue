<script setup lang="ts">
import { computed } from "vue";
import type { DisplayStatus } from "@pinlayer/shared";
import { Icon } from "@pinlayer/design";
import { personById, type SessionListItem } from "@/shared/lib/data";
import { sevBg, topSeverity } from "@/shared/lib/severity";
import Favicon from "@/shared/components/Favicon.vue";
import SeverityHeatbar from "@/shared/components/SeverityHeatbar.vue";
import StatusChip from "@/shared/components/StatusChip.vue";
import UserAvatar from "@/shared/components/UserAvatar.vue";

const props = defineProps<{ session: SessionListItem }>();

const reporter = computed(() => personById(props.session.reporterId));
const top = computed(() => topSeverity(props.session.severityCounts));
const status = computed(() => props.session.status as DisplayStatus);
</script>

<template>
  <RouterLink
    :to="`/s/${session.id}`"
    class="group relative flex items-center gap-3 border-b px-4 py-4 pl-5 transition-colors last:border-b-0 hover:bg-muted/50"
  >
    <span class="absolute inset-y-0 left-0 w-[2px]" :class="sevBg[top]" />

    <span class="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{{
      session.shortId
    }}</span>

    <div class="flex min-w-0 flex-1 items-center gap-2">
      <Favicon
        :label="session.faviconLabel"
        :hue="session.faviconHue"
        :size="14"
      />
      <span class="truncate text-sm text-foreground">{{ session.title }}</span>
    </div>

    <span
      class="hide-narrow w-44 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
      >{{ session.pageUrl.replace(/^https?:\/\//, "") }}</span
    >
    <div class="hide-narrow w-40 shrink-0">
      <SeverityHeatbar :counts="session.severityCounts" />
    </div>
    <span
      class="hide-narrow w-14 shrink-0 text-right font-mono text-[11px] text-muted-foreground"
      >{{ session.pinCount }}</span
    >
    <UserAvatar
      class="hide-narrow"
      :name="reporter.name"
      :hue="reporter.avatarHue"
      :size="24"
    />
    <StatusChip class="shrink-0" :status="status" />
    <Icon
      name="chevron-right"
      :size="15"
      class="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
    />
  </RouterLink>
</template>
