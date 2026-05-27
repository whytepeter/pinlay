<script setup lang="ts">
defineProps<{
  label: string;
  sub?: string;
  inline?: boolean;
  for?: string;
}>();
</script>

<template>
  <div
    :class="
      inline
        ? 'flex flex-col gap-2 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-4'
        : 'flex flex-col gap-2'
    "
  >
    <div class="flex flex-col gap-0.5">
      <label
        :for="$props.for"
        class="text-sm font-medium text-foreground"
      >
        {{ label }}
      </label>
      <span v-if="sub" class="text-xs text-muted-foreground">{{ sub }}</span>
    </div>
    <div :class="inline ? 'min-w-0' : ''">
      <slot />
    </div>
  </div>
</template>
