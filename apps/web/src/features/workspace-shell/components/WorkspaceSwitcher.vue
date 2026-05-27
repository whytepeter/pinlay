<script setup lang="ts">
import { reactive, ref, watch } from "vue";
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

defineProps<{ collapsed?: boolean }>();
const emit = defineEmits<{ "update:open": [boolean] }>();

interface Workspace {
  id: string;
  name: string;
  plan: string;
}

const workspaces = ref<Workspace[]>([
  { id: "acme", name: "Acme Inc", plan: "Team" },
  { id: "side", name: "Side Project", plan: "Free" },
]);
const current = ref<Workspace>(workspaces.value[0]!);

// Sidebar stays expanded while the menu OR the create dialog is open.
const open = ref(false);
const createOpen = ref(false);
watch([open, createOpen], ([a, b]) => emit("update:open", a || b));

const draft = reactive<{ name: string }>({ name: "" });

function openCreate() {
  draft.name = "";
  createOpen.value = true;
}

function submitCreate() {
  const trimmed = draft.name.trim();
  if (!trimmed) return;
  const id = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!id || workspaces.value.some((w) => w.id === id)) return;
  const next: Workspace = { id, name: trimmed, plan: "Free" };
  workspaces.value.push(next);
  current.value = next;
  createOpen.value = false;
}
</script>

<template>
  <DropdownMenu v-model:open="open">
    <DropdownMenuTrigger as-child>
      <button
        class="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        :class="collapsed ? 'justify-center' : ''"
      >
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground"
          >{{ current.name.charAt(0) }}</span
        >
        <span v-show="!collapsed" class="min-w-0 flex-1 whitespace-nowrap">
          <span class="block truncate text-sm font-medium leading-tight">{{
            current.name
          }}</span>
          <span class="block text-[11px] leading-tight text-muted-foreground"
            >{{ current.plan }} plan</span
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
    <DropdownMenuContent align="start" class="w-56">
      <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="w in workspaces"
        :key="w.id"
        @click="current = w"
      >
        <span
          class="flex size-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground"
          >{{ w.name.charAt(0) }}</span
        >
        <span class="flex-1">{{ w.name }}</span>
        <Icon v-if="w.id === current.id" name="check" :size="14" />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="openCreate">
        <Icon name="plus" :size="14" /> Create workspace
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <Dialog v-model:open="createOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create workspace</DialogTitle>
        <DialogDescription>
          A separate space for a different team or project. You can switch
          between workspaces from the sidebar.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-2 py-2">
        <Label for="ws-name">Name</Label>
        <Input
          id="ws-name"
          v-model="draft.name"
          placeholder="e.g. Side Project"
          autocomplete="off"
          @keydown.enter="submitCreate"
        />
      </div>
      <DialogFooter>
        <Button variant="ghost" size="sm" @click="createOpen = false">
          Cancel
        </Button>
        <Button
          size="sm"
          :disabled="!draft.name.trim()"
          @click="submitCreate"
        >
          Create workspace
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
