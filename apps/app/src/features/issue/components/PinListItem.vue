<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@pinlayer/design";
import { personById, type PinItem } from "@/shared/lib/data";
import PinPill from "@/shared/components/PinPill.vue";
import SeverityDot from "@/shared/components/SeverityDot.vue";
import TypeChip from "@/shared/components/TypeChip.vue";
import UserAvatar from "@/shared/components/UserAvatar.vue";

const props = defineProps<{ pin: PinItem; active?: boolean }>();

const assignee = computed(() =>
  props.pin.assigneeId ? personById(props.pin.assigneeId) : undefined
);
const resolved = computed(() => props.pin.status === "resolved");
</script>

<template>
  <button
    type="button"
    class="relative flex w-full flex-col gap-1.5 border-b px-4 py-3 pl-5 text-left transition-colors last:border-b-0"
    :class="active ? 'bg-secondary' : 'hover:bg-muted/50'"
  >
    <span v-if="active" class="absolute inset-y-0 left-0 w-[2px] bg-primary" />
    <div class="flex items-center gap-2">
      <PinPill :n="pin.index" sm />
      <SeverityDot :level="pin.severity" :size="7" />
      <span
        class="line-clamp-1 flex-1 text-[13px] font-medium"
        :class="
          resolved ? 'text-muted-foreground line-through' : 'text-foreground'
        "
        >{{ pin.title }}</span
      >
    </div>
    <div class="flex items-center gap-2 pl-[34px]">
      <TypeChip :type="pin.type" />
      <Icon
        v-if="pin.stale"
        name="triangle-alert"
        :size="13"
        class="text-[color:var(--status-stale)]"
      />
      <UserAvatar
        v-if="assignee"
        class="ml-auto"
        :name="assignee.name"
        :hue="assignee.avatarHue"
        :size="18"
      />
    </div>
  </button>
</template>
