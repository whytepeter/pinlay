<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { DisplayStatus, Status } from "@pinlay/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Input,
} from "@pinlay/design";
import type { ApiPin, MemberRef, WorkspaceMemberRow } from "@/shared/lib/api";
import { firstName } from "@/shared/lib/format";
import { hashHue } from "@/shared/lib/issue-display";
import PinPill from "@/shared/components/PinPill.vue";
import SeverityChip from "@/shared/components/SeverityChip.vue";
import TypeChip from "@/shared/components/TypeChip.vue";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import ScreenshotViewer from "./ScreenshotViewer.vue";
import AnchorBlock from "./AnchorBlock.vue";
import ActivityThread from "./ActivityThread.vue";

const props = defineProps<{
  pin: ApiPin;
  index: number;
  total: number;
  members: WorkspaceMemberRow[];
  /** Whether the current user can delete this pin (author or admin). */
  canDelete?: boolean;
}>();
const assignee = computed(() => props.pin.assignee);

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

// The pin's title is API-derived (first line of comment); show the rest of
// the comment as the body — falls back to the comment itself if there's no
// extra body content.
const body = computed(() => {
  const c = props.pin.comment ?? "";
  const t = props.pin.title ?? "";
  if (!c) return "";
  if (t && c.startsWith(t)) {
    const rest = c.slice(t.length).replace(/^\s*\n+/, "").trim();
    return rest || "";
  }
  return c;
});

// ── Labels editor ───────────────────────────────────────────────────────
const emit = defineEmits<{
  next: [];
  prev: [];
  setStatus: [Status];
  setAssignee: [MemberRef | null];
  setLabels: [string[]];
  delete: [];
}>();
function onDeleteClick() {
  if (
    window.confirm(
      `Delete pin #${props.pin.index}? This permanently removes the pin and its comments. This can't be undone.`,
    )
  ) {
    emit("delete");
  }
}

const labelDraft = ref("");
const addingLabel = ref(false);
const labelInput = ref<HTMLInputElement | null>(null);

function startAddLabel() {
  addingLabel.value = true;
  labelDraft.value = "";
  nextTick(() => labelInput.value?.focus());
}
function cancelAddLabel() {
  addingLabel.value = false;
  labelDraft.value = "";
}
/**
 * Commit the typed label. Splits on comma so the user can paste a list. Dedup
 * + lower-cases for a stable set; never shrinks beyond what was typed.
 */
function commitLabel() {
  const raw = labelDraft.value.trim();
  if (!raw) {
    cancelAddLabel();
    return;
  }
  const next = new Set(props.pin.labels.map((l) => l.toLowerCase()));
  for (const part of raw.split(",")) {
    const t = part.trim().toLowerCase();
    if (t) next.add(t);
  }
  emit("setLabels", Array.from(next));
  labelDraft.value = "";
  addingLabel.value = false;
}
function removeLabel(label: string) {
  emit(
    "setLabels",
    props.pin.labels.filter((l) => l !== label),
  );
}
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
                :hue="hashHue(assignee.id)"
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
              v-if="assignee"
              @click="$emit('setAssignee', null)"
            >
              <Icon name="user-minus" :size="14" /> Unassign
            </DropdownMenuItem>
            <DropdownMenuItem
              v-for="m in members"
              :key="m.id"
              @click="$emit('setAssignee', { id: m.userId, name: m.name, email: m.email, avatarUrl: m.avatarUrl })"
            >
              <UserAvatar :name="m.name" :hue="hashHue(m.userId)" :size="18" />
              {{ m.name }}
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
        <!-- More actions — author/admin only for the moment, since Delete
             is the only entry. When non-destructive items land they'll
             flip this to always-visible. -->
        <DropdownMenu v-if="canDelete">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" title="More">
              <Icon name="ellipsis" :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              class="text-destructive focus:bg-destructive/10 focus:text-destructive"
              @click="onDeleteClick"
            >
              <Icon name="trash-2" :size="14" /> Delete pin
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h2 class="text-[19px] font-semibold leading-tight tracking-tight">
        {{ pin.title }}
      </h2>
    </div>

    <!-- body -->
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-6 sm:px-6">
        <p
          v-if="body"
          class="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
        >{{ body }}</p>
        <ScreenshotViewer :pin="pin" />

        <!-- Labels — chip editor. Existing labels render as removable chips,
             followed by an "+ Add" affordance that swaps to an inline input
             on click. Comma in the input commits multiple labels at once. -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            v-if="pin.labels.length === 0 && !addingLabel"
            class="text-xs text-muted-foreground"
          >
            No labels yet.
          </span>
          <span
            v-for="l in pin.labels"
            :key="l"
            class="group inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
          >
            <Icon name="tag" :size="10" class="text-muted-foreground" />
            {{ l }}
            <button
              type="button"
              class="rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
              :title="`Remove ${l}`"
              :aria-label="`Remove label ${l}`"
              @click="removeLabel(l)"
            >
              <Icon name="x" :size="10" />
            </button>
          </span>
          <Input
            v-if="addingLabel"
            ref="labelInput"
            v-model="labelDraft"
            placeholder="label, label"
            class="h-7 w-40 px-2 py-0 text-xs"
            @keydown.enter.prevent="commitLabel"
            @keydown.escape.prevent="cancelAddLabel"
            @blur="commitLabel"
          />
          <button
            v-else
            type="button"
            class="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="startAddLabel"
          >
            <Icon name="plus" :size="11" /> Add label
          </button>
        </div>

        <AnchorBlock
          v-if="pin.anchor"
          :anchor="pin.anchor"
          :stale="pin.stale"
        />
        <ActivityThread :pin="pin" />
      </div>
    </div>
  </div>
</template>
