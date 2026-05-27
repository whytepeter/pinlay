<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div class="mb-4">
    <h2 class="text-base font-semibold tracking-tight text-foreground">
      {{ title }}
    </h2>
    <p v-if="subtitle" class="mt-1 text-sm text-muted-foreground">
      {{ subtitle }}
    </p>
  </div>
</template>
