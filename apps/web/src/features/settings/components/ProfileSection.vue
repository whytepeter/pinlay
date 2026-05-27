<script setup lang="ts">
import { reactive, computed } from "vue";
import { Button, Icon, Input } from "@pinlay/design";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import { useSettings } from "../composables/useSettings";
import SectionHeading from "./SectionHeading.vue";
import FormGroup from "./FormGroup.vue";
import FormField from "./FormField.vue";

const { profile, updateProfile } = useSettings();
const draft = reactive({
  name: profile.value.name,
  email: profile.value.email,
});
const dirty = computed(
  () =>
    draft.name !== profile.value.name || draft.email !== profile.value.email,
);

function save() {
  updateProfile({ name: draft.name, email: draft.email });
}
function reset() {
  draft.name = profile.value.name;
  draft.email = profile.value.email;
}
</script>

<template>
  <SectionHeading title="Profile" subtitle="Your account name and email." />

  <FormGroup>
    <FormField label="Avatar" sub="PNG or JPG, up to 2 MB." inline>
      <div class="flex items-center gap-3">
        <UserAvatar :name="profile.name" :hue="profile.avatarHue" :size="48" />
        <Button variant="outline" size="sm">
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
      />
    </FormField>

    <FormField for="profile-email" label="Email" inline>
      <Input
        id="profile-email"
        v-model="draft.email"
        type="email"
        autocomplete="email"
        class="max-w-sm"
      />
    </FormField>
  </FormGroup>

  <div class="mt-6 flex justify-end gap-2">
    <Button variant="ghost" size="sm" :disabled="!dirty" @click="reset">
      Cancel
    </Button>
    <Button size="sm" :disabled="!dirty" @click="save">Save changes</Button>
  </div>
</template>
