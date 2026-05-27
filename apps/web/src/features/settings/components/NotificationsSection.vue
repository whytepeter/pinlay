<script setup lang="ts">
import { Switch } from "@pinlayer/design";
import { useSettings } from "../composables/useSettings";
import type { NotificationKey } from "../composables/useSettings";
import SectionHeading from "./SectionHeading.vue";
import FormGroup from "./FormGroup.vue";

const { notifications } = useSettings();

const EVENTS: { key: NotificationKey; label: string }[] = [
  { key: "newComment", label: "A new session is created" },
  { key: "pinAssigned", label: "A pin is assigned to you" },
  { key: "mentioned", label: "You are mentioned in a comment" },
  { key: "statusChanged", label: "Status of a pin you own changes" },
  { key: "criticalLanded", label: "A critical pin lands in your team" },
  { key: "syncFailed", label: "An integration sync fails" },
  { key: "weeklyDigest", label: "Weekly triage digest" },
];
</script>

<template>
  <SectionHeading
    title="Notifications"
    subtitle="Choose what reaches your inbox and your Slack."
  />

  <FormGroup>
    <div
      class="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_80px_80px] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
    >
      <div>Event</div>
      <div class="text-center">Email</div>
      <div class="text-center">Slack</div>
    </div>
    <div
      v-for="(row, i) in EVENTS"
      :key="row.key"
      class="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_80px_80px] items-center gap-3 px-1 py-2 text-sm"
      :class="i !== 0 ? 'border-t' : ''"
    >
      <div>{{ row.label }}</div>
      <div class="flex justify-center">
        <Switch v-model="notifications[row.key].email" />
      </div>
      <div class="flex justify-center">
        <Switch v-model="notifications[row.key].slack" />
      </div>
    </div>
  </FormGroup>
</template>
