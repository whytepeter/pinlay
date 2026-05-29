<!--
  LauncherItem — single row inside the FloatingLauncher's command menu.
  Only annotation-relevant icons (annotate / check / close / list). pinlay
  is annotation-only for v1.
-->
<template>
  <button
    type="button"
    :disabled="disabled"
    @click="!disabled && $emit('click')"
    :class="[
      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left border-0',
      'bg-transparent font-sans cursor-pointer transition-all duration-100',
      'active:scale-[0.99] focus-visible:outline-none',
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : 'hover:bg-secondary/80 group',
    ]"
  >
    <span
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors"
    >
      <svg
        v-if="icon === 'annotate'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-[15px] h-[15px]"
      >
        <path
          d="M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2Z"
        />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      <svg
        v-else-if="icon === 'check'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-[15px] h-[15px]"
      >
        <path d="M20 6 L9 17 l-5 -5" />
      </svg>
      <svg
        v-else-if="icon === 'close'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-[15px] h-[15px]"
      >
        <path d="M18 6 L6 18 M6 6 l12 12" />
      </svg>
      <svg
        v-else-if="icon === 'list'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-[15px] h-[15px]"
      >
        <path
          d="M8 6 h13 M8 12 h13 M8 18 h13 M3 6 h.01 M3 12 h.01 M3 18 h.01"
        />
      </svg>
    </span>

    <span class="flex flex-col gap-0.5 flex-1 min-w-0">
      <span class="flex items-center gap-1.5">
        <strong class="text-[13px] font-medium text-foreground leading-snug">{{
          label
        }}</strong>
        <Badge
          v-if="badge"
          variant="secondary"
          class="text-[10px] px-1.5 py-0"
          >{{ badge }}</Badge
        >
      </span>
      <small class="text-[11px] text-muted-foreground leading-snug">{{
        description
      }}</small>
    </span>
  </button>
</template>

<script setup lang="ts">
import { Badge } from "@pinlay/design";

defineProps<{
  icon: "annotate" | "check" | "close" | "list";
  label: string;
  description: string;
  disabled?: boolean;
  badge?: string;
}>();

defineEmits<{ click: [] }>();
</script>
