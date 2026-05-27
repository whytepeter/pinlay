<script setup lang="ts">
import { ref, watch } from "vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@pinlayer/design";

defineProps<{ collapsed?: boolean }>();
const emit = defineEmits<{ "update:open": [boolean] }>();

interface Workspace {
  id: string;
  name: string;
  plan: string;
}

const workspaces: Workspace[] = [
  { id: "acme", name: "Acme Inc", plan: "Pro" },
  { id: "side", name: "Side Project", plan: "Free" },
];
const current = ref<Workspace>(workspaces[0]!);

// Surface open state so the sidebar can stay expanded while the menu is open.
const open = ref(false);
watch(open, (v) => emit("update:open", v));
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
      <DropdownMenuItem>
        <Icon name="plus" :size="14" /> Create workspace
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
