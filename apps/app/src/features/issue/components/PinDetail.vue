<script setup lang="ts">
import { computed } from "vue";
import type { DisplayStatus, Status } from "@pinlayer/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
} from "@pinlayer/design";
import { PEOPLE, personById, type PinItem } from "@/shared/lib/data";
import { firstName } from "@/shared/lib/format";
import PinPill from "@/shared/components/PinPill.vue";
import SeverityChip from "@/shared/components/SeverityChip.vue";
import TypeChip from "@/shared/components/TypeChip.vue";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import ScreenshotViewer from "./ScreenshotViewer.vue";
import AnchorBlock from "./AnchorBlock.vue";
import ActivityThread from "./ActivityThread.vue";
import ReplyBox from "./ReplyBox.vue";

const props = defineProps<{ pin: PinItem; index: number; total: number }>();
defineEmits<{
  next: [];
  prev: [];
  setStatus: [Status];
  setAssignee: [string];
}>();

const assignee = computed(() =>
  props.pin.assigneeId ? personById(props.pin.assigneeId) : undefined,
);

const STATUS: Record<DisplayStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "var(--status-open)" },
  in_progress: { label: "In progress", color: "var(--status-progress)" },
  resolved: { label: "Resolved", color: "var(--status-resolved)" },
};
const statusInfo = computed(
  () => STATUS[props.pin.status as DisplayStatus] ?? STATUS.open,
);
const STATUS_OPTIONS: DisplayStatus[] = ["open", "in_progress", "resolved"];

const isResolved = computed(() => props.pin.status === "resolved");
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- sticky header -->
    <div
      class="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background/85 px-4 py-4 backdrop-blur sm:px-6"
    >
      <!-- meta + pin navigation -->
      <div class="flex items-center gap-2">
        <PinPill :n="pin.index" />
        <SeverityChip :level="pin.severity" />
        <TypeChip :type="pin.type" />
        <span
          v-if="pin.stale"
          class="hide-mobile inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-[color:var(--status-stale)]"
          :style="{
            borderColor:
              'color-mix(in oklab, var(--status-stale) 35%, var(--border))',
          }"
        >
          <Icon name="triangle-alert" :size="12" /> Stale
        </span>

        <div class="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            title="Previous pin (K)"
            @click="$emit('prev')"
          >
            <Icon name="chevron-up" :size="15" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            title="Next pin (J)"
            @click="$emit('next')"
          >
            <Icon name="chevron-down" :size="15" />
          </Button>
          <span class="ml-1 font-mono text-[11px] text-muted-foreground"
            >{{ index + 1 }}/{{ total }}</span
          >
        </div>
      </div>

      <!-- actions -->
      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="gap-1.5">
              <UserAvatar
                v-if="assignee"
                :name="assignee.name"
                :hue="assignee.avatarHue"
                :size="18"
              />
              <span class="hide-mobile">{{
                assignee ? firstName(assignee.name) : "Assign"
              }}</span>
              <Icon name="chevron-down" :size="13" class="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              v-for="p in PEOPLE"
              :key="p.id"
              @click="$emit('setAssignee', p.id)"
            >
              <UserAvatar :name="p.name" :hue="p.avatarHue" :size="18" />
              {{ p.name }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="gap-1.5">
              <span
                class="size-1.5 shrink-0 rounded-full"
                :style="{ background: statusInfo.color }"
              />
              <span>{{ statusInfo.label }}</span>
              <Icon name="chevron-down" :size="13" class="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              v-for="o in STATUS_OPTIONS"
              :key="o"
              @click="$emit('setStatus', o)"
            >
              <span
                class="size-1.5 shrink-0 rounded-full"
                :style="{ background: STATUS[o].color }"
              />
              {{ STATUS[o].label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          v-if="isResolved"
          variant="outline"
          size="sm"
          class="ml-auto"
          @click="$emit('setStatus', 'open')"
        >
          <Icon name="rotate-ccw" :size="14" /> Re-open
        </Button>
        <Button
          v-else
          size="sm"
          class="ml-auto"
          @click="$emit('setStatus', 'resolved')"
        >
          <Icon name="check" :size="14" /> Resolve
        </Button>
      </div>

      <h2 class="text-[19px] font-semibold leading-tight tracking-tight">
        {{ pin.title }}
      </h2>
    </div>

    <!-- body -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-6 sm:px-6">
        <p class="text-sm leading-relaxed text-foreground/90">{{ pin.body }}</p>
        <ScreenshotViewer :pin="pin" />
        <AnchorBlock v-if="pin.anchor" :anchor="pin.anchor" :stale="pin.stale" />
        <ActivityThread :pin="pin" />
        <ReplyBox />
      </div>
    </div>
  </div>
</template>
