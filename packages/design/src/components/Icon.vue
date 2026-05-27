<!--
  Icon
  ────
  Thin wrapper around lucide-vue-next. Works inside shadow DOM — lucide
  renders plain SVGs with no CSS injection so it's safe in extensions.

  Usage:
    <Icon name="arrow-right" />
    <Icon name="pencil" :size="16" :stroke-width="2" />

  Accepts kebab-case names ("arrow-right"). Resolves to lucide's exported
  component (both `ArrowRight` and `ArrowRightIcon` work in v0.447+, we
  prefer the unsuffixed form and fall back to the Icon suffix).
-->
<template>
  <component
    v-if="icon"
    :is="icon"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as icons from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }>(),
  {
    size: 16,
    strokeWidth: 1.75,
  },
);

function pascal(s: string): string {
  return s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

const icon = computed(() => {
  const base = pascal(props.name ?? '');
  const reg = icons as Record<string, unknown>;
  return (reg[base] ?? reg[`${base}Icon`]) as unknown;
});
</script>
