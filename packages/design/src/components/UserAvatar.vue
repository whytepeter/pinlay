<script setup lang="ts">
/**
 * The one avatar for people, everywhere — dashboard, extension popup, and
 * on-page surfaces render identical circles (2026-07-12 uniformity pass).
 * Real image when `avatarUrl` is set; deterministic hue-tinted initials
 * otherwise. `hue` comes from the caller (hash of the user id) so a person
 * keeps their color across surfaces.
 */
import { computed } from "vue";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

const props = withDefaults(
  defineProps<{
    name: string;
    hue?: number;
    size?: number;
    avatarUrl?: string | null;
  }>(),
  { hue: 262, size: 24, avatarUrl: null },
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
    <AvatarImage
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="name"
      class="h-full w-full object-cover"
    />
    <AvatarFallback :style="fallbackStyle" class="font-semibold">{{
      initials
    }}</AvatarFallback>
  </Avatar>
</template>
