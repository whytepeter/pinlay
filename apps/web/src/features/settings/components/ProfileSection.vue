<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { Button, Icon, Input } from "@pinlay/design";
import { useAuth } from "@/shared/composables/useAuth";
import { apiClient, type Me } from "@/shared/lib/api";
import { hashHue } from "@/shared/lib/issue-display";
import { toast } from "@/shared/lib/toast";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import SectionHeading from "./SectionHeading.vue";
import FormGroup from "./FormGroup.vue";
import FormField from "./FormField.vue";

const auth = useAuth();
const user = auth.user;

const draft = reactive<{ name: string }>({ name: "" });
watch(
  user,
  (u) => {
    draft.name = u?.name ?? "";
  },
  { immediate: true },
);

const dirty = computed(
  () => !!user.value && draft.name.trim() !== user.value.name,
);

const hue = computed(() => (user.value ? hashHue(user.value.id) : 262));

const updateMutation = useMutation({
  mutationFn: (input: { name: string }) => apiClient.updateMe(input),
  onSuccess: (me: Me) => {
    // Refresh the in-memory user so the rest of the app (avatars, status bar,
    // greeting) reflects the new name immediately.
    auth.applyMe(me);
    toast.success("Profile updated");
  },
  onError: (err) => toast.error(err),
});

function save() {
  if (!dirty.value) return;
  updateMutation.mutate({ name: draft.name.trim() });
}
function reset() {
  if (user.value) draft.name = user.value.name;
}

function changeAvatar() {
  // TODO(api): avatar upload pipeline (R2/S3 + signed-URL) not wired yet.
  toast.info("Avatar upload comes online when the storage pipeline ships.");
}
</script>

<template>
  <SectionHeading title="Profile" subtitle="Your account name and email." />

  <FormGroup>
    <FormField label="Avatar" sub="PNG or JPG, up to 2 MB." inline>
      <div class="flex items-center gap-3">
        <UserAvatar
          :name="user?.name ?? ''"
          :hue="hue"
          :size="48"
        />
        <Button variant="outline" size="sm" @click="changeAvatar">
          <Icon name="image-up" :size="14" /> Change
        </Button>
      </div>
    </FormField>

    <FormField for="profile-name" label="Name" inline>
      <Input
        id="profile-name"
        v-model="draft.name"
        autocomplete="name"
        class="max-w-sm"
        :disabled="updateMutation.isPending.value"
      />
    </FormField>

    <FormField
      for="profile-email"
      label="Email"
      sub="Email changes need verification (coming soon)."
      inline
    >
      <Input
        id="profile-email"
        :model-value="user?.email ?? ''"
        type="email"
        autocomplete="email"
        readonly
        class="max-w-sm"
      />
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
      :disabled="!dirty || updateMutation.isPending.value"
      @click="save"
    >
      <Icon
        v-if="updateMutation.isPending.value"
        name="loader-circle"
        :size="14"
        class="animate-spin"
      />
      Save changes
    </Button>
  </div>
</template>
