<!--
  Brand
  ─────
  pinlay's custom app mark. A tapered pin (head + offset stem) with an evenodd-
  punched inner hole — renders cleanly on any background since the hole is true
  transparency, not a white knockout. Use this anywhere we used to render
  <Icon name="map-pin" /> as the brand mark.

  Usage:
    <Brand :size="24" class="text-primary" />

  The mark inherits `currentColor`, so set color via Tailwind text utilities.
-->
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    role="img"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12 1.5C7.85 1.5 4.5 4.85 4.5 9c0 3.45 2.32 6.5 5.5 8L12 22l2-5c3.18-1.5 5.5-4.55 5.5-8 0-4.15-3.35-7.5-7.5-7.5zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 24 });
</script>
