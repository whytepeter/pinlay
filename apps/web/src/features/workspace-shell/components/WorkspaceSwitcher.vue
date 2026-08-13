<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Input,
  Label,
} from "@pinlay/design";
import { apiClient, type Workspace } from "@/shared/lib/api";
import { useAuth } from "@/shared/composables/useAuth";
import { toast } from "@/shared/lib/toast";

defineProps<{
  collapsed?: boolean;
  /** Navbar pill: initial + name + chevron, no plan line, quiet surface. */
  compact?: boolean;
}>();
const emit = defineEmits<{ "update:open": [boolean] }>();

const auth = useAuth();
const router = useRouter();
const queryClient = useQueryClient();

const open = ref(false);
const createOpen = ref(false);
watch([open, createOpen], ([a, b]) => emit("update:open", a || b));

// Eager: needed on mount so the trigger renders the active workspace's name
// (not a fallback to the user's name). The payload is tiny — one row per
// workspace the caller belongs to.
const workspacesQuery = useQuery({
  queryKey: ["workspaces"],
  queryFn: () => apiClient.workspaces.list(),
});

// The active workspace is the one the JWT is bound to.
const activeId = computed(() => auth.user.value?.orgId ?? null);
const current = computed<Workspace | null>(() => {
  const id = activeId.value;
  if (!id) return null;
  const list = workspacesQuery.data.value;
  return list?.find((w) => w.id === id) ?? null;
});

const placeholderName = computed(() => current.value?.name ?? "Workspace");
const placeholderPlan = computed(() => current.value?.plan ?? "");

const switchingTo = ref<string | null>(null);

/**
 * Shared post-switch reconciliation: replace the bearer token, drop every
 * cached query (it's all keyed on the old workspace), navigate home. Called
 * from both the switch and create flows since both mint a new JWT bound to
 * the target workspace.
 */
async function adoptWorkspace(token: string, workspace: Workspace) {
  auth.setToken(token, { id: workspace.id, role: workspace.role });
  // Reset every cached query EXCEPT ['workspaces'] — the rest are keyed on
  // the previous workspace's JWT and would leak stale data. We deliberately
  // keep the workspaces observer alive so the seeded setQueryData below
  // propagates to the dropdown without a refetch round-trip.
  //
  // Must be resetQueries, not removeQueries: removeQueries only deletes the
  // cache entry — an already-mounted observer (e.g. the Pin Inbox's
  // useInfiniteQuery, still rendered behind this dropdown) keeps showing its
  // last data until something re-triggers it, so switching workspace looked
  // like a no-op until a hard refresh. resetQueries clears the data AND
  // refetches active queries immediately.
  await queryClient.resetQueries({
    predicate: (q) => {
      const root = Array.isArray(q.queryKey) ? q.queryKey[0] : q.queryKey;
      return root !== "workspaces";
    },
  });
  queryClient.setQueryData<Workspace[]>(["workspaces"], (prev) => {
    if (!prev) return [workspace];
    const idx = prev.findIndex((w) => w.id === workspace.id);
    if (idx >= 0) {
      const next = prev.slice();
      next[idx] = workspace;
      return next;
    }
    return [...prev, workspace];
  });
  open.value = false;
  createOpen.value = false;
  await router.push("/");
}

const switchMutation = useMutation({
  mutationFn: (id: string) => apiClient.workspaces.switch(id),
  onMutate: (id) => {
    switchingTo.value = id;
  },
  onSuccess: async (res) => {
    await adoptWorkspace(res.token, res.workspace);
    toast.success(`Switched to ${res.workspace.name}`);
  },
  onError: (err) => toast.error(err),
  onSettled: () => {
    switchingTo.value = null;
  },
});

function chooseWorkspace(ws: Workspace) {
  if (ws.id === current.value?.id) {
    open.value = false;
    return;
  }
  switchMutation.mutate(ws.id);
}

// ── Create workspace ──────────────────────────────────────────────────────
const draft = reactive<{ name: string }>({ name: "" });

function openCreate() {
  draft.name = "";
  createOpen.value = true;
  open.value = false;
}

const createMutation = useMutation({
  mutationFn: (input: { name: string }) =>
    apiClient.workspaces.create(input),
  onSuccess: async (res) => {
    await adoptWorkspace(res.token, res.workspace);
    toast.success(`Created ${res.workspace.name}`);
  },
  onError: (err) => toast.error(err),
});

function submitCreate() {
  const name = draft.name.trim();
  if (!name) return;
  createMutation.mutate({ name });
}
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <!-- Compact pill for the top navbar -->
      <button
        v-if="compact"
        class="flex min-h-[36px] max-w-full items-center gap-1.5 rounded-full bg-muted/60 py-1 pl-1.5 pr-2.5 text-left transition-all hover:bg-muted active:scale-[0.97]"
      >
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
          >{{ placeholderName.charAt(0).toUpperCase() }}</span
        >
        <span class="truncate text-[13px] font-medium">{{ placeholderName }}</span>
        <Icon
          name="chevrons-up-down"
          :size="13"
          class="shrink-0 text-muted-foreground"
        />
      </button>
      <!-- Original wide trigger (settings pages, future sidebars) -->
      <button
        v-else
        class="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        :class="collapsed ? 'justify-center' : ''"
      >
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
          >{{ placeholderName.charAt(0).toUpperCase() }}</span
        >
        <span v-show="!collapsed" class="min-w-0 flex-1 whitespace-nowrap">
          <span class="block truncate text-sm font-medium leading-tight">{{
            placeholderName
          }}</span>
          <span
            v-if="placeholderPlan"
            class="block text-[11px] leading-tight text-muted-foreground"
            >{{ placeholderPlan }} plan</span
          >
        </span>
        <Icon
          v-show="!collapsed"
          name="chevrons-up-down"
          :size="14"
          class="shrink-0 text-muted-foreground"
        />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-64">
      <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
      <DropdownMenuSeparator />

      <div
        v-if="workspacesQuery.isPending.value"
        class="px-2 py-3 text-center text-xs text-muted-foreground"
      >
        Loading…
      </div>
      <div
        v-else-if="workspacesQuery.isError.value"
        class="space-y-2 px-2 py-3"
      >
        <p class="text-xs text-destructive">Couldn't load workspaces.</p>
        <Button
          size="sm"
          variant="ghost"
          class="w-full"
          @click="workspacesQuery.refetch()"
        >
          Try again
        </Button>
      </div>
      <template v-else>
        <DropdownMenuItem
          v-for="w in workspacesQuery.data.value"
          :key="w.id"
          :disabled="switchingTo !== null"
          @select="(e: Event) => { e.preventDefault(); chooseWorkspace(w); }"
        >
          <span
            class="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
            >{{ w.name.charAt(0).toUpperCase() }}</span
          >
          <span class="min-w-0 flex-1 truncate">{{ w.name }}</span>
          <Icon
            v-if="switchingTo === w.id"
            name="loader-circle"
            :size="14"
            class="animate-spin text-muted-foreground"
          />
          <Icon
            v-else-if="w.id === activeId"
            name="check"
            :size="14"
          />
        </DropdownMenuItem>
      </template>

      <DropdownMenuSeparator />
      <DropdownMenuItem @select="(e: Event) => { e.preventDefault(); openCreate(); }">
        <Icon name="plus" :size="14" /> Create workspace
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <Dialog v-model:open="createOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create workspace</DialogTitle>
        <DialogDescription>
          A separate space for a different team or project. You'll be moved
          into the new workspace after creating it.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-2 py-2">
        <Label for="ws-name">Name</Label>
        <Input
          id="ws-name"
          v-model="draft.name"
          placeholder="e.g. Side Project"
          autocomplete="off"
          :disabled="createMutation.isPending.value"
          @keydown.enter="submitCreate"
        />
      </div>
      <DialogFooter>
        <Button
          variant="ghost"
          size="sm"
          :disabled="createMutation.isPending.value"
          @click="createOpen = false"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          :disabled="
            !draft.name.trim() || createMutation.isPending.value
          "
          @click="submitCreate"
        >
          <Icon
            v-if="createMutation.isPending.value"
            name="loader-circle"
            :size="14"
            class="animate-spin"
          />
          {{ createMutation.isPending.value ? "Creating…" : "Create workspace" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
