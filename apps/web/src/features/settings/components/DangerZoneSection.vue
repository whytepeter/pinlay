<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Button, Icon, Input, Skeleton } from "@pinlay/design";
import { apiClient } from "@/shared/lib/api";
import { useAuth } from "@/shared/composables/useAuth";
import { toast } from "@/shared/lib/toast";
import SectionHeading from "./SectionHeading.vue";

const auth = useAuth();
const router = useRouter();
const queryClient = useQueryClient();

const workspaceQuery = useQuery({
  queryKey: ["workspace", "current"],
  queryFn: () => apiClient.workspaces.current(),
});
const workspace = computed(() => workspaceQuery.data.value ?? null);

// Server enforces owner-only on DELETE /workspaces/current. We mirror the
// gate here so a non-owner sees an explanatory state instead of clicking
// through to a 403.
const isOwner = computed(() => workspace.value?.role === "owner");

const confirmText = ref("");
const confirmPhrase = computed(() =>
  workspace.value ? `delete ${workspace.value.slug}` : "",
);
const canDelete = computed(
  () =>
    isOwner.value &&
    !!workspace.value &&
    confirmText.value === confirmPhrase.value,
);

const deleteMutation = useMutation({
  mutationFn: () => apiClient.workspaces.remove(),
  onSuccess: async () => {
    const name = workspace.value?.name ?? "Workspace";
    // Clear every cache — they're all keyed on the now-deleted workspace.
    queryClient.clear();
    // Log out (also clears the bearer token) + send to sign-in. The server
    // already invalidated this workspace's data; the token would still work
    // until expiry but points at a workspace that no longer exists, so
    // dropping it is the cleanest local state to leave.
    auth.logout();
    toast.success(`${name} deleted`);
    await router.push({ name: "login" });
  },
  onError: (err) => toast.error(err),
});

function confirmDelete() {
  if (!canDelete.value || deleteMutation.isPending.value) return;
  deleteMutation.mutate();
}
</script>

<template>
  <SectionHeading
    title="Danger zone"
    subtitle="Irreversible actions. Read carefully."
  />

  <!-- loading: matches the destructive card frame so the layout doesn't jump
       when the workspace row resolves. -->
  <div
    v-if="workspaceQuery.isPending.value"
    class="rounded-lg border bg-card p-5"
  >
    <div class="flex items-start gap-3">
      <Skeleton class="size-5 rounded" />
      <div class="flex-1 space-y-2">
        <Skeleton class="h-3.5 w-32" />
        <Skeleton class="h-3 w-[80%]" />
        <Skeleton class="h-3 w-[60%]" />
      </div>
    </div>
  </div>

  <!-- workspace failed to load — show a contained error so the rest of the
       page is still usable. -->
  <div
    v-else-if="!workspace"
    class="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
  >
    <p class="text-sm text-destructive">Couldn't load workspace.</p>
    <Button variant="outline" size="sm" @click="workspaceQuery.refetch()">
      Try again
    </Button>
  </div>

  <!-- non-owner: members + admins can SEE the danger zone but the button is
       gated so they don't paper over a 403 with confusing UX. -->
  <div
    v-else-if="!isOwner"
    class="flex items-start gap-3 rounded-lg border bg-muted/30 p-5"
  >
    <Icon
      name="lock"
      :size="18"
      class="mt-0.5 shrink-0 text-muted-foreground"
    />
    <div class="flex-1">
      <p class="text-sm font-semibold text-foreground">Delete workspace</p>
      <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
        Only the workspace owner can delete <span class="font-medium text-foreground">{{ workspace.name }}</span>.
      </p>
    </div>
  </div>

  <!-- owner: real type-to-confirm flow. -->
  <div
    v-else
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
        This permanently deletes
        <span class="font-medium text-foreground">{{ workspace.name }}</span>,
        all sessions, pins, boards, members, and invites.
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
          :disabled="deleteMutation.isPending.value"
          class="font-mono sm:max-w-[280px]"
        />
        <Button
          variant="destructive"
          size="sm"
          :disabled="!canDelete || deleteMutation.isPending.value"
          @click="confirmDelete"
        >
          <Icon
            v-if="deleteMutation.isPending.value"
            name="loader-circle"
            :size="14"
            class="animate-spin"
          />
          {{
            deleteMutation.isPending.value
              ? "Deleting…"
              : "I understand, delete workspace"
          }}
        </Button>
      </div>
    </div>
  </div>
</template>
