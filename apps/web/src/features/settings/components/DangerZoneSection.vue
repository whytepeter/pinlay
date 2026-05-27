<script setup lang="ts">
import { ref, computed } from "vue";
import { Button, Icon, Input } from "@pinlay/design";
import { useSettings } from "../composables/useSettings";
import SectionHeading from "./SectionHeading.vue";

const { workspace } = useSettings();

const confirmText = ref("");
const confirmPhrase = computed(() => `delete ${workspace.slug}`);
const canDelete = computed(() => confirmText.value === confirmPhrase.value);

function confirmDelete() {
  if (!canDelete.value) return;
  // mock: would call API then redirect to /sign-in
  confirmText.value = "";
}
</script>

<template>
  <SectionHeading
    title="Danger zone"
    subtitle="Irreversible actions. Read carefully."
  />

  <div
    class="flex items-start gap-3 rounded-lg border p-5"
    :style="{
      background:
        'color-mix(in oklab, var(--destructive) 5%, var(--card))',
      borderColor:
        'color-mix(in oklab, var(--destructive) 30%, var(--border))',
    }"
  >
    <Icon
      name="triangle-alert"
      :size="18"
      class="mt-0.5 shrink-0 text-destructive"
    />
    <div class="flex-1">
      <p class="text-sm font-semibold text-foreground">Delete workspace</p>
      <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
        This permanently deletes {{ workspace.name }}, all sessions, pins,
        integrations, and audit logs.
        <br />
        Type
        <span class="font-mono text-foreground">{{ confirmPhrase }}</span>
        to confirm.
      </p>
      <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          v-model="confirmText"
          :placeholder="confirmPhrase"
          autocomplete="off"
          class="font-mono sm:max-w-[280px]"
        />
        <Button
          variant="destructive"
          size="sm"
          :disabled="!canDelete"
          @click="confirmDelete"
        >
          I understand, delete workspace
        </Button>
      </div>
    </div>
  </div>
</template>
