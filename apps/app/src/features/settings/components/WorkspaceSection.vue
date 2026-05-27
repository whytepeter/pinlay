<script setup lang="ts">
import { reactive, computed } from "vue";
import type { IntegrationKind } from "@pinlayer/shared";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pinlayer/design";
import { useSettings } from "../composables/useSettings";
import SectionHeading from "./SectionHeading.vue";
import FormGroup from "./FormGroup.vue";
import FormField from "./FormField.vue";

const { workspace, updateWorkspace } = useSettings();

const INTEGRATIONS: { value: IntegrationKind; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "jira", label: "Jira" },
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "slack", label: "Slack" },
  { value: "notion", label: "Notion" },
];

const draft = reactive({
  name: workspace.name,
  slug: workspace.slug,
  defaultIntegration: workspace.defaultIntegration as string,
});
const dirty = computed(
  () =>
    draft.name !== workspace.name ||
    draft.slug !== workspace.slug ||
    draft.defaultIntegration !== workspace.defaultIntegration
);

function save() {
  updateWorkspace({
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    defaultIntegration: draft.defaultIntegration as IntegrationKind,
  });
}
function reset() {
  draft.name = workspace.name;
  draft.slug = workspace.slug;
  draft.defaultIntegration = workspace.defaultIntegration;
}
</script>

<template>
  <SectionHeading
    title="Workspace"
    subtitle="Your team's identity in pinLayer."
  />

  <FormGroup>
    <FormField for="ws-name" label="Workspace name" inline>
      <Input id="ws-name" v-model="draft.name" class="max-w-sm" />
    </FormField>

    <FormField
      for="ws-slug"
      label="Workspace URL"
      sub="Used for shareable links."
      inline
    >
      <div
        class="flex max-w-sm items-stretch overflow-hidden rounded-md border"
      >
        <span
          class="flex items-center bg-muted px-3 font-mono text-xs text-muted-foreground"
        >
          pinlayer.app/
        </span>
        <Input
          id="ws-slug"
          v-model="draft.slug"
          class="rounded-none border-0 font-mono focus-visible:ring-0"
        />
      </div>
    </FormField>

    <FormField
      for="ws-integration"
      label="Default integration"
      sub="New sessions push to this tracker unless overridden."
      inline
    >
      <Select v-model="draft.defaultIntegration">
        <SelectTrigger id="ws-integration" class="w-full">
          <SelectValue placeholder="Select integration" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="i in INTEGRATIONS" :key="i.value" :value="i.value">
            {{ i.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  </FormGroup>

  <div class="mt-6 flex justify-end gap-2">
    <Button variant="ghost" size="sm" :disabled="!dirty" @click="reset">
      Cancel
    </Button>
    <Button size="sm" :disabled="!dirty" @click="save">Save changes</Button>
  </div>
</template>
