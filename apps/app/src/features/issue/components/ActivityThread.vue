<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@pinlayer/design";
import {
  getActivity,
  personById,
  type ActivityFeedItem,
  type PinItem,
} from "@/shared/lib/data";
import { timeAgo } from "@/shared/lib/format";
import UserAvatar from "@/shared/components/UserAvatar.vue";

const props = defineProps<{ pin: PinItem }>();

const items = computed(() => getActivity(props.pin));

const iconFor: Record<string, string> = {
  pinned: "map-pin",
  status: "circle-dot",
  sync: "refresh-cw",
  assign: "user-round",
};

function sysText(it: ActivityFeedItem): string {
  return {
    pinned: "pinned this",
    status: "changed status",
    sync: `synced to ${it.meta}`,
    assign: `assigned ${it.meta}`,
    comment: "",
  }[it.kind];
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="text-sm font-medium">Activity</div>
    <div class="relative flex flex-col gap-4">
      <span class="absolute bottom-3 left-[13px] top-3 w-px bg-border" />
      <div v-for="it in items" :key="it.id" class="relative flex gap-3">
        <template v-if="it.kind === 'comment'">
          <UserAvatar
            class="z-10 shrink-0"
            :name="personById(it.actorId).name"
            :hue="personById(it.actorId).avatarHue"
            :size="27"
          />
          <div class="flex-1 rounded-lg border bg-card p-3">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-medium">{{
                personById(it.actorId).name
              }}</span>
              <span class="text-[11px] text-muted-foreground">{{
                timeAgo(it.createdAt)
              }}</span>
            </div>
            <p class="mt-1 text-[13px] leading-relaxed text-foreground/90">
              {{ it.body }}
            </p>
          </div>
        </template>
        <template v-else>
          <span
            class="z-10 flex size-[27px] shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground"
          >
            <Icon :name="iconFor[it.kind]" :size="13" />
          </span>
          <div
            class="flex flex-wrap items-center gap-1.5 pt-1.5 text-[12px] text-muted-foreground"
          >
            <span class="font-medium text-foreground">{{
              personById(it.actorId).name
            }}</span>
            {{ sysText(it) }}
            <span>· {{ timeAgo(it.createdAt) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
