<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Button, Icon, Input, Skeleton } from "@pinlay/design";
import { apiClient, type Workspace } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";
import SectionHeading from "./SectionHeading.vue";
import FormGroup from "./FormGroup.vue";
import FormField from "./FormField.vue";

const queryClient = useQueryClient();

const workspaceQuery = useQuery({
  queryKey: ["workspace", "current"],
  queryFn: () => apiClient.workspaces.current(),
});

const workspace = computed<Workspace | null>(
  () => workspaceQuery.data.value ?? null,
);

// Draft is reset to the loaded server state whenever the query resolves /
// refetches, so users always edit a fresh snapshot.
const draft = reactive<{ name: string; slug: string }>({ name: "", slug: "" });
watch(
  workspace,
  (w) => {
    if (w) {
      draft.name = w.name;
      draft.slug = w.slug;
    }
  },
  { immediate: true },
);

const nameDirty = computed(
  () => !!workspace.value && draft.name.trim() !== workspace.value.name,
);
const slugDirty = computed(
  () => !!workspace.value && draft.slug.trim() !== workspace.value.slug,
);
const dirty = computed(() => nameDirty.value || slugDirty.value);

// Slug validation — same shape as the server, surfaced inline so users see
// the error before they hit Save.
const slugError = computed(() => {
  if (!slugDirty.value) return null;
  const v = draft.slug.trim();
  if (v.length < 2) return "At least 2 characters.";
  if (v.length > 60) return "60 characters max.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(v)) {
    return "Lowercase letters, digits, and hyphens (no leading/trailing).";
  }
  return null;
});

const canSave = computed(() => dirty.value && !slugError.value);

const updateMutation = useMutation({
  mutationFn: (input: { name?: string; slug?: string }) =>
    apiClient.workspaces.update(input),
  onSuccess: (next) => {
    queryClient.setQueryData(["workspace", "current"], next);
    // Slug + name both surface in the switcher.
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    toast.success("Workspace updated");
  },
  onError: (err) => toast.error(err),
});

function save() {
  if (!canSave.value) return;
  const patch: { name?: string; slug?: string } = {};
  if (nameDirty.value) patch.name = draft.name.trim();
  if (slugDirty.value) patch.slug = draft.slug.trim().toLowerCase();
  updateMutation.mutate(patch);
}
function reset() {
  if (workspace.value) {
    draft.name = workspace.value.name;
    draft.slug = workspace.value.slug;
  }
}
</script>

<template>
  <SectionHeading
    title="Workspace"
    subtitle="Your team's identity in pinlay."
  />

  <FormGroup v-if="workspaceQuery.isPending.value">
    <!-- Skeleton form rows so the layout reserves space for the real fields. -->
    <div
      v-for="i in 4"
      :key="`fld-${i}`"
      class="flex flex-col gap-2 md:grid md:grid-cols-[220px_1fr] md:items-center md:gap-6"
    >
      <div class="space-y-1.5">
        <Skeleton class="h-3.5 w-28" />
        <Skeleton class="h-3 w-40" />
      </div>
      <Skeleton class="h-9 w-full max-w-sm" />
    </div>
  </FormGroup>

  <FormGroup v-else-if="workspaceQuery.isError.value">
    <div class="flex items-center justify-between gap-3 py-2">
      <p class="text-sm text-destructive">Couldn't load workspace.</p>
      <Button variant="outline" size="sm" @click="workspaceQuery.refetch()">
        Try again
      </Button>
    </div>
  </FormGroup>

  <template v-else-if="workspace">
    <FormGroup>
      <FormField for="ws-name" label="Workspace name" inline>
        <Input
          id="ws-name"
          v-model="draft.name"
          class="max-w-sm"
          :disabled="updateMutation.isPending.value"
        />
      </FormField>

      <FormField
        for="ws-slug"
        label="Workspace URL"
        sub="Lowercase letters, digits, and hyphens."
        inline
      >
        <div class="flex max-w-sm flex-col gap-1.5">
          <div
            class="flex items-stretch overflow-hidden rounded-md border bg-card"
            :class="
              slugError ? 'border-destructive/50 focus-within:border-destructive' : ''
            "
          >
            <span
              class="flex items-center bg-muted px-3 font-mono text-xs text-muted-foreground"
            >
              pinlay.io/
            </span>
            <Input
              id="ws-slug"
              v-model="draft.slug"
              class="rounded-none border-0 font-mono focus-visible:ring-0"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              :disabled="updateMutation.isPending.value"
            />
          </div>
          <p v-if="slugError" class="text-xs text-destructive">
            {{ slugError }}
          </p>
          <p
            v-else-if="slugDirty"
            class="text-xs text-muted-foreground"
          >
            Old links to the previous URL will break.
          </p>
        </div>
      </FormField>

      <FormField label="Plan" inline>
        <span
          class="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium capitalize text-primary"
          >{{ workspace.plan }}</span
        >
      </FormField>

      <FormField label="Members" inline>
        <span class="text-sm text-muted-foreground"
          >{{ workspace.memberCount }} ·
          <span class="capitalize">{{ workspace.role }}</span>
        </span>
      </FormField>
    </FormGroup>

    <div class="mt-6 flex justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        :disabled="!dirty || updateMutation.isPending.value"
        @click="reset"
      >
        Cancel
      </Button>
      <Button
        size="sm"
        :disabled="!canSave || updateMutation.isPending.value"
        @click="save"
      >
        <Icon
          v-if="updateMutation.isPending.value"
          name="loader-circle"
          :size="14"
          class="animate-spin"
        />
        {{ updateMutation.isPending.value ? "Saving…" : "Save changes" }}
      </Button>
    </div>
  </template>
</template>
