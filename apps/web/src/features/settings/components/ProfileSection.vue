<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
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
  mutationFn: (input: { name: string; avatarUrl?: string | null }) =>
    apiClient.updateMe(input),
  onSuccess: (me: Me) => {
    // Refresh the in-memory user so the rest of the app (avatars, status bar,
    // greeting) reflects the new name immediately.
    auth.applyMe(me);
  },
  onError: (err) => toast.error(err),
});

function save() {
  if (!dirty.value) return;
  updateMutation.mutate({ name: draft.name.trim() }, {
    onSuccess: () => toast.success("Profile updated"),
  });
}
function reset() {
  if (user.value) draft.name = user.value.name;
}

// ── Avatar upload ────────────────────────────────────────────────────────
// Three steps: request a presigned PUT, PUT the blob straight to storage,
// PATCH /auth/me with the returned publicUrl. The blob never touches Nest.
const fileInput = ref<HTMLInputElement | null>(null);
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // matches the 2MB copy below
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const avatarUploading = ref(false);

async function onPickAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Reset immediately so the same file re-triggers change if the user retries.
  input.value = "";
  if (!file) return;

  if (!ACCEPTED_TYPES.includes(file.type)) {
    toast.error("Use a PNG, JPG, WebP, or GIF image.");
    return;
  }
  if (file.size > AVATAR_MAX_BYTES) {
    toast.error("Avatar must be under 2 MB.");
    return;
  }

  avatarUploading.value = true;
  try {
    const presign = await apiClient.avatarUploadUrl({
      contentType: file.type,
      sizeBytes: file.size,
      filename: file.name,
    });
    const put = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: presign.headers,
      body: file,
    });
    if (!put.ok) throw new Error(`Upload failed (${put.status})`);

    const me = await apiClient.updateMe({ avatarUrl: presign.publicUrl });
    auth.applyMe(me);
    toast.success("Avatar updated");
  } catch (err) {
    toast.error(err as Error);
  } finally {
    avatarUploading.value = false;
  }
}

async function clearAvatar() {
  try {
    const me = await apiClient.updateMe({ avatarUrl: null });
    auth.applyMe(me);
    toast.success("Avatar cleared");
  } catch (err) {
    toast.error(err as Error);
  }
}
</script>

<template>
  <SectionHeading title="Profile" subtitle="Your account name and email." />

  <FormGroup>
    <FormField label="Avatar" sub="PNG, JPG, WebP, or GIF — up to 2 MB." inline>
      <div class="flex items-center gap-3">
        <UserAvatar
          :name="user?.name ?? ''"
          :avatar-url="user?.avatarUrl ?? null"
          :hue="hue"
          :size="48"
        />
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          class="hidden"
          @change="onPickAvatar"
        />
        <Button
          variant="outline"
          size="sm"
          :disabled="avatarUploading"
          @click="fileInput?.click()"
        >
          <Icon
            v-if="avatarUploading"
            name="loader-circle"
            :size="14"
            class="animate-spin"
          />
          <Icon v-else name="image-up" :size="14" />
          {{ avatarUploading ? "Uploading…" : "Change" }}
        </Button>
        <Button
          v-if="user?.avatarUrl"
          variant="ghost"
          size="sm"
          :disabled="avatarUploading"
          @click="clearAvatar"
        >
          Remove
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
