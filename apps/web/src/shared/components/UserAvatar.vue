<script setup lang="ts">
import { computed } from "vue";
import { Avatar, AvatarFallback } from "@pinlay/design";

const props = withDefaults(
  defineProps<{ name: string; hue?: number; size?: number }>(),
  { hue: 262, size: 24 },
);

const initials = computed(() =>
  props.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join(""),
);

const sizeStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderColor: `oklch(0.46 0.12 ${props.hue})`,
}));

const fallbackStyle = computed(() => ({
  background: `linear-gradient(135deg, oklch(0.62 0.14 ${props.hue}), oklch(0.45 0.12 ${props.hue}))`,
  color: "#fff",
  fontSize: `${Math.max(9, props.size * 0.4)}px`,
}));
</script>

<template>
  <Avatar :style="sizeStyle" class="border">
    <AvatarFallback :style="fallbackStyle" class="font-semibold">{{
      initials
    }}</AvatarFallback>
  </Avatar>
</template>
