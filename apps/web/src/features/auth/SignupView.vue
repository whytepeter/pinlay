<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Input, Label, Icon } from "@pinlay/design";
import AuthLayout from "./AuthLayout.vue";
import { useAuth } from "@/shared/composables/useAuth";

const router = useRouter();
const route = useRoute();
const { signup } = useAuth();

const name = ref("");
const email = ref("");
const password = ref("");
const workspaceName = ref("");
const showPassword = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);

function redirectTarget(): string {
  const r = route.query.redirect;
  const target = Array.isArray(r) ? r[0] : r;
  if (typeof target === "string" && target.startsWith("/")) return target;
  return "/";
}

async function onSubmit() {
  if (submitting.value) return;
  error.value = null;
  submitting.value = true;
  try {
    await signup({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      workspaceName: workspaceName.value.trim() || undefined,
    });
    await router.replace(redirectTarget());
  } catch (e) {
    error.value = (e as Error).message || "Could not create your account.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AuthLayout
    title="Create your account"
    subtitle="Start dropping pins on your live product in minutes."
  >
    <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <div class="flex flex-col gap-1.5">
        <Label for="name">Name</Label>
        <Input
          id="name"
          v-model="name"
          autocomplete="name"
          placeholder="Alex Rivera"
          required
          autofocus
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="email">Work email</Label>
        <Input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="you@company.com"
          required
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="password">Password</Label>
        <div class="relative">
          <Input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="At least 8 characters"
            required
            class="pr-10"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="15" />
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="workspace">
          Workspace name
          <span class="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="workspace"
          v-model="workspaceName"
          placeholder="Acme Inc"
        />
      </div>

      <p
        v-if="error"
        class="flex items-start gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive"
        role="alert"
      >
        <Icon name="circle-alert" :size="14" class="mt-px shrink-0" />
        <span>{{ error }}</span>
      </p>

      <Button type="submit" :disabled="submitting" class="mt-1 w-full">
        <Icon v-if="submitting" name="loader-circle" :size="15" class="animate-spin" />
        {{ submitting ? "Creating account…" : "Create account" }}
      </Button>
    </form>

    <p class="mt-6 text-center text-[13px] text-muted-foreground">
      Already have an account?
      <RouterLink
        :to="{ name: 'login', query: route.query }"
        class="font-medium text-primary hover:underline"
      >
        Sign in
      </RouterLink>
    </p>
  </AuthLayout>
</template>
