<script setup lang="ts">
import { computed, nextTick, reactive, ref } from "vue";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Skeleton,
  Textarea,
} from "@pinlay/design";
import {
  apiClient,
  type ApiPin,
  type PinCommentRow,
} from "@/shared/lib/api";
import { useAuth } from "@/shared/composables/useAuth";
import { hashHue } from "@/shared/lib/issue-display";
import { timeAgo } from "@/shared/lib/format";
import { toast } from "@/shared/lib/toast";
import { confirm } from "@/shared/lib/confirm";
import UserAvatar from "@/shared/components/UserAvatar.vue";

/**
 * Real activity thread for a single pin.
 *   • A synthetic "pinned by X" + "assigned to Y" row at the top, derived
 *     from pin.author / pin.assignee. These don't have a comment row
 *     server-side — they're inherent to the pin.
 *   • Live comments fetched from /annotation/pins/:id/comments + a composer
 *     at the bottom. Comments are author-editable / admin-removable.
 */
const props = defineProps<{ pin: ApiPin }>();

const queryClient = useQueryClient();
const auth = useAuth();

const commentsQuery = useQuery({
  queryKey: computed(() => ["pin", props.pin.id, "comments"]),
  queryFn: () => apiClient.pins.comments.list(props.pin.id),
});

const comments = computed<PinCommentRow[]>(
  () => commentsQuery.data.value ?? [],
);

const me = computed(() => auth.user.value);
const isAdmin = computed(
  () => me.value?.role === "owner" || me.value?.role === "admin",
);
function canEdit(c: PinCommentRow): boolean {
  return me.value?.id === c.author.id;
}
function canDelete(c: PinCommentRow): boolean {
  return canEdit(c) || isAdmin.value;
}

// ── Composer ────────────────────────────────────────────────────────────
const draft = ref("");
const composerRef = ref<HTMLTextAreaElement | null>(null);

const createMutation = useMutation({
  mutationFn: (body: string) =>
    apiClient.pins.comments.create(props.pin.id, body),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["pin", props.pin.id, "comments"],
    });
    draft.value = "";
    nextTick(() => composerRef.value?.focus());
  },
  onError: (err) => toast.error(err),
});

function submit() {
  const body = draft.value.trim();
  if (!body || createMutation.isPending.value) return;
  createMutation.mutate(body);
}

function onComposerKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl+Enter submits — keeps the textarea free for multi-line input.
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    submit();
  }
}

// ── Inline edit / delete ─────────────────────────────────────────────────
const editingId = ref<string | null>(null);
const editDrafts = reactive<Record<string, string>>({});

function startEdit(c: PinCommentRow) {
  editingId.value = c.id;
  editDrafts[c.id] = c.body;
}
function cancelEdit() {
  editingId.value = null;
}

const updateMutation = useMutation({
  mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
    apiClient.pins.comments.update(props.pin.id, commentId, body),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["pin", props.pin.id, "comments"],
    });
    editingId.value = null;
  },
  onError: (err) => toast.error(err),
});
function submitEdit(c: PinCommentRow) {
  const body = (editDrafts[c.id] ?? "").trim();
  if (!body) return;
  if (body === c.body) {
    editingId.value = null;
    return;
  }
  updateMutation.mutate({ commentId: c.id, body });
}

const removeMutation = useMutation({
  mutationFn: (commentId: string) =>
    apiClient.pins.comments.remove(props.pin.id, commentId),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["pin", props.pin.id, "comments"],
    });
    toast.success("Comment deleted");
  },
  onError: (err) => toast.error(err),
});
function confirmDelete(c: PinCommentRow) {
  return confirm({
    title: "Delete this comment?",
    message: "This permanently removes the comment from the thread.",
    confirmLabel: "Delete",
    variant: "destructive",
    onConfirm: () => removeMutation.mutateAsync(c.id),
  });
}

// ── Synthetic system events derived from the pin itself ─────────────────
interface SystemEvent {
  id: string;
  kind: "pinned" | "assign";
  actor: { id: string; name: string; avatarUrl: string | null };
  meta?: string;
  createdAt: string;
}
const systemEvents = computed<SystemEvent[]>(() => {
  const list: SystemEvent[] = [];
  if (props.pin.author) {
    list.push({
      id: `${props.pin.id}-pinned`,
      kind: "pinned",
      actor: {
        id: props.pin.author.id,
        name: props.pin.author.name,
        avatarUrl: props.pin.author.avatarUrl,
      },
      createdAt: props.pin.createdAt,
    });
  }
  if (props.pin.assignee) {
    const actor = props.pin.author ?? props.pin.assignee;
    list.push({
      id: `${props.pin.id}-assignee`,
      kind: "assign",
      actor: { id: actor.id, name: actor.name, avatarUrl: actor.avatarUrl },
      meta: props.pin.assignee.name,
      createdAt: props.pin.updatedAt,
    });
  }
  return list;
});

const iconFor: Record<SystemEvent["kind"], string> = {
  pinned: "map-pin",
  assign: "user-round",
};
function sysText(it: SystemEvent): string {
  return it.kind === "pinned" ? "pinned this" : `assigned ${it.meta}`;
}

// Show the connecting timeline rail when there's more than one row.
const totalRows = computed(
  () => systemEvents.value.length + comments.value.length,
);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="text-sm font-medium">Activity</div>

    <!-- Skeleton: 1 system event + 2 comment placeholders. -->
    <div
      v-if="commentsQuery.isPending.value"
      class="flex flex-col gap-4"
    >
      <div v-for="i in 3" :key="`sk-${i}`" class="flex gap-3">
        <Skeleton class="size-[27px] shrink-0 rounded-full" />
        <div class="flex-1 space-y-1.5">
          <Skeleton class="h-3 w-32" />
          <Skeleton class="h-3 w-[70%]" />
        </div>
      </div>
    </div>

    <div v-else class="relative flex flex-col gap-4">
      <span
        v-if="totalRows > 1"
        class="absolute bottom-3 left-[13px] top-3 w-px bg-border"
      />

      <!-- System events: pinned, assigned. One avatar per row — the actor's
           real avatar, not an icon tile + mini-avatar pair. -->
      <div v-for="it in systemEvents" :key="it.id" class="relative flex gap-3">
        <UserAvatar
          class="z-10 shrink-0"
          :name="it.actor.name"
          :avatar-url="it.actor.avatarUrl"
          :hue="hashHue(it.actor.id)"
          :size="28"
        />
        <div
          class="flex flex-wrap items-center gap-1 pt-1.5 text-[12px] text-muted-foreground"
        >
          <span class="font-medium text-foreground">{{ it.actor.name }}</span>
          {{ sysText(it) }}
          <Icon :name="iconFor[it.kind]" :size="11" class="opacity-60" />
          <span>· {{ timeAgo(it.createdAt) }}</span>
        </div>
      </div>

      <!-- Real comments — quiet filled bubbles (this whole thread already
           lives inside a card; border-on-card reads as nesting). -->
      <div v-for="c in comments" :key="c.id" class="relative flex gap-3">
        <UserAvatar
          class="z-10 shrink-0"
          :name="c.author.name"
          :avatar-url="c.author.avatarUrl"
          :hue="hashHue(c.author.id)"
          :size="28"
        />
        <div class="flex-1 rounded-xl bg-muted/50 p-3">
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-medium">{{ c.author.name }}</span>
            <span class="text-[11px] text-muted-foreground">{{
              timeAgo(c.createdAt)
            }}</span>
            <span
              v-if="c.updatedAt !== c.createdAt"
              class="text-[11px] text-muted-foreground"
              :title="`Edited ${timeAgo(c.updatedAt)}`"
            >
              · edited
            </span>
            <DropdownMenu v-if="canEdit(c) || canDelete(c)">
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="ml-auto flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  title="More"
                >
                  <Icon name="ellipsis" :size="14" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-36">
                <DropdownMenuItem v-if="canEdit(c)" @select="startEdit(c)">
                  <Icon name="pencil" :size="14" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="canDelete(c)"
                  class="text-destructive"
                  @select="confirmDelete(c)"
                >
                  <Icon name="trash-2" :size="14" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <!-- Inline edit mode swaps the body for a textarea. -->
          <template v-if="editingId === c.id">
            <Textarea
              v-model="editDrafts[c.id]"
              class="mt-2 min-h-[60px] text-[13px]"
              :disabled="updateMutation.isPending.value"
            />
            <div class="mt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                :disabled="updateMutation.isPending.value"
                @click="cancelEdit"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                :disabled="
                  !editDrafts[c.id]?.trim() || updateMutation.isPending.value
                "
                @click="submitEdit(c)"
              >
                <Icon
                  v-if="updateMutation.isPending.value"
                  name="loader-circle"
                  :size="14"
                  class="animate-spin"
                />
                {{
                  updateMutation.isPending.value ? "Saving…" : "Save"
                }}
              </Button>
            </div>
          </template>
          <p
            v-else
            class="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90"
          >{{ c.body }}</p>
        </div>
      </div>
    </div>

    <!-- Composer — the filled Textarea IS the field (its own padding +
         muted surface); no extra wrapper card so the placeholder never
         touches an edge. -->
    <div class="flex flex-col gap-2">
      <Textarea
        ref="composerRef"
        v-model="draft"
        placeholder="Write a comment…"
        class="min-h-[72px] resize-y text-[13px]"
        :disabled="createMutation.isPending.value"
        @keydown="onComposerKeydown"
      />
      <div class="flex items-center justify-between gap-2">
        <span class="text-[11px] text-muted-foreground">
          <span class="font-mono">⌘↵</span> to send
        </span>
        <Button
          size="sm"
          class="rounded-full"
          :disabled="!draft.trim() || createMutation.isPending.value"
          @click="submit"
        >
          <Icon
            v-if="createMutation.isPending.value"
            name="loader-circle"
            :size="14"
            class="animate-spin"
          />
          {{ createMutation.isPending.value ? "Sending…" : "Comment" }}
        </Button>
      </div>
    </div>
  </div>
</template>
