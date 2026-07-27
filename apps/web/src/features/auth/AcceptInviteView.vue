<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Button, Icon, Input, Label } from "@pinlay/design";
import {
  apiClient,
  type ApiError,
  type PublicInvitePreview,
  type SwitchWorkspaceResult,
} from "@/shared/lib/api";
import { useAuth } from "@/shared/composables/useAuth";
import { toast } from "@/shared/lib/toast";
import { hashHue } from "@/shared/lib/issue-display";
import AuthLayout from "./AuthLayout.vue";

/**
 * Public invite-accept page reached from an invite link
 * (`/invite/<token>`). Branches:
 *
 *   1. Invite missing/expired/revoked → terminal error state.
 *   2. No pinlay account for the email → name + password form
 *      (POST /invites/:token/accept-with-signup). Lands inside workspace.
 *   3. Has an account, not signed in → "Sign in" CTA that redirects via
 *      /login?redirect=/invite/<token>, then auto-accepts on return.
 *   4. Signed in, email matches → auto-accept on mount + navigate to /.
 *   5. Signed in, email doesn't match → "log out to accept as X" banner.
 *
 * The auto-accept on (4) is debounced behind `autoAcceptTried` so a render
 * loop can't double-fire the mutation.
 */
const route = useRoute();
const router = useRouter();
const auth = useAuth();
const queryClient = useQueryClient();

const token = computed(() => String(route.params.token));

const inviteQuery = useQuery({
  queryKey: computed(() => ["invite", token.value]),
  queryFn: () => apiClient.invites.lookup(token.value),
  retry: false,
});

const invite = computed<PublicInvitePreview | null>(
  () => inviteQuery.data.value ?? null,
);

const errorMessage = computed(() => {
  const err = inviteQuery.error.value as ApiError | null | undefined;
  if (!err) return null;
  return err.message || "This invite couldn't be loaded.";
});
const signedIn = computed(() => auth.isAuthenticated.value);
const emailMatches = computed(
  () => !!auth.user.value && !!invite.value && auth.user.value.email.toLowerCase() === invite.value.email.toLowerCase(),
);

async function adopt(res: SwitchWorkspaceResult, message: string) {
  auth.setToken(res.token, { id: res.workspace.id, role: res.workspace.role });
  queryClient.clear();
  toast.success(message);
  await router.replace("/");
}

const acceptMutation = useMutation({
  mutationFn: () => apiClient.invites.accept(token.value),
  onSuccess: (res) => adopt(res, `Joined ${res.workspace.name}`),
  onError: (err) => toast.error(err),
});

const signupForm = reactive({ name: "", password: "" });
const signupMutation = useMutation({
  mutationFn: () =>
    apiClient.invites.acceptWithSignup(token.value, {
      name: signupForm.name.trim(),
      password: signupForm.password,
    }),
  onSuccess: (res) =>
    adopt(res, `Welcome to ${res.workspace.name}`),
  onError: (err) => toast.error(err),
});

// Auto-accept once the preview loads if the signed-in user matches the
// invite email. Tracked behind a ref so re-renders don't keep firing it.
const autoAcceptTried = ref(false);
watch(
  [inviteQuery.isSuccess, signedIn, emailMatches],
  ([ok, isAuth, matches]) => {
    if (
      ok &&
      isAuth &&
      matches &&
      !autoAcceptTried.value &&
      !acceptMutation.isPending.value
    ) {
      autoAcceptTried.value = true;
      acceptMutation.mutate();
    }
  },
);

onMounted(() => {
  // Catches the edge case where the watcher misses the first paint because
  // all three flags were already true before the watcher attached.
  if (
    inviteQuery.isSuccess.value &&
    signedIn.value &&
    emailMatches.value &&
    !autoAcceptTried.value
  ) {
    autoAcceptTried.value = true;
    acceptMutation.mutate();
  }
});

function goSignIn() {
  void router.push({
    name: "login",
    query: { redirect: route.fullPath, email: invite.value?.email },
  });
}

async function logOut() {
  auth.logout();
  // Re-query so the page rebranches into the unauthenticated state.
  await queryClient.invalidateQueries({ queryKey: ["invite", token.value] });
}

const submitSignupDisabled = computed(() => {
  if (signupMutation.isPending.value) return true;
  if (!signupForm.name.trim()) return true;
  if (signupForm.password.length < 8) return true;
  return false;
});

function submitSignup() {
  if (submitSignupDisabled.value) return;
  signupMutation.mutate();
}

const initial = computed(() =>
  invite.value?.workspace.name.charAt(0).toUpperCase() ?? "?",
);
const wsHue = computed(() =>
  invite.value ? hashHue(invite.value.workspace.id) : 262,
);
</script>

<template>
  <AuthLayout
    :title="
      errorMessage
        ? 'Invite unavailable'
        : invite
          ? `Join ${invite.workspace.name}`
          : 'Loading invite…'
    "
    :subtitle="
      errorMessage
        ? undefined
        : invite
          ? `${invite.invitedBy.name} invited you as ${invite.role}.`
          : undefined
    "
  >
    <!-- loading -->
    <div
      v-if="inviteQuery.isPending.value"
      class="flex items-center gap-2 py-6 text-sm text-muted-foreground"
    >
      <Icon name="loader-circle" :size="16" class="animate-spin" />
      Loading invite…
    </div>

    <!-- terminal error (404, 410 expired/revoked/accepted) -->
    <div v-else-if="errorMessage" class="flex flex-col gap-4 py-2">
      <div
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-5 py-8 text-center"
      >
        <span
          class="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        >
          <Icon name="triangle-alert" :size="20" />
        </span>
        <p class="text-sm text-foreground">{{ errorMessage }}</p>
        <p class="text-xs text-muted-foreground">
          Ask the person who invited you to send a fresh link.
        </p>
      </div>
      <Button variant="outline" size="sm" class="w-full" @click="router.push('/login')">
        Go to sign in
      </Button>
    </div>

    <!-- happy paths -->
    <template v-else-if="invite">
      <!-- workspace card -->
      <div
        class="mb-5 flex items-center gap-3 rounded-lg border bg-card p-3"
      >
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-md text-base font-bold text-white"
          :style="{
            background: `linear-gradient(135deg, oklch(0.62 0.16 ${wsHue}), oklch(0.42 0.13 ${wsHue}))`,
          }"
          >{{ initial }}</span
        >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-foreground">
            {{ invite.workspace.name }}
          </p>
          <p class="truncate text-xs text-muted-foreground">
            pinlay.io/{{ invite.workspace.slug }}
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium capitalize text-primary"
          >{{ invite.role }}</span
        >
      </div>

      <!-- branch 5: signed in as wrong email -->
      <div
        v-if="signedIn && !emailMatches"
        class="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
      >
        <div class="flex items-start gap-2">
          <Icon
            name="user-cog"
            :size="16"
            class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <div class="text-sm">
            <p class="font-medium text-foreground">
              This invite is for {{ invite.email }}.
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              You're signed in as <span class="font-mono">{{ auth.user.value?.email }}</span
              >. Log out and reopen the link as the invited email.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" class="self-start" @click="logOut">
          <Icon name="log-out" :size="14" /> Sign out
        </Button>
      </div>

      <!-- branch 4: signed in with matching email — auto-accept spinner -->
      <div
        v-else-if="signedIn && emailMatches"
        class="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground"
      >
        <Icon name="loader-circle" :size="16" class="animate-spin" />
        Joining {{ invite.workspace.name }}…
      </div>

      <!-- branch 3: has account, not signed in -->
      <div v-else-if="invite.hasAccount" class="flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">
          Sign in to <span class="font-mono">{{ invite.email }}</span> to
          accept this invite.
        </p>
        <Button class="w-full" @click="goSignIn">
          <Icon name="log-in" :size="14" /> Sign in to accept
        </Button>
      </div>

      <!-- branch 2: no account — signup form -->
      <form
        v-else
        class="flex flex-col gap-4"
        @submit.prevent="submitSignup"
      >
        <div class="grid gap-2">
          <Label for="inv-email">Email</Label>
          <Input
            id="inv-email"
            type="email"
            :model-value="invite.email"
            readonly
            class="font-mono"
          />
        </div>
        <div class="grid gap-2">
          <Label for="inv-name">Your name</Label>
          <Input
            id="inv-name"
            v-model="signupForm.name"
            autocomplete="name"
            placeholder="e.g. Bright Eze"
            :disabled="signupMutation.isPending.value"
            required
          />
        </div>
        <div class="grid gap-2">
          <Label for="inv-pw">Password</Label>
          <Input
            id="inv-pw"
            v-model="signupForm.password"
            type="password"
            autocomplete="new-password"
            placeholder="At least 8 characters"
            :disabled="signupMutation.isPending.value"
            required
          />
        </div>
        <Button type="submit" class="w-full" :disabled="submitSignupDisabled">
          <Icon
            v-if="signupMutation.isPending.value"
            name="loader-circle"
            :size="14"
            class="animate-spin"
          />
          {{
            signupMutation.isPending.value ? "Creating account…" : "Create account & join"
          }}
        </Button>
        <p class="text-center text-xs text-muted-foreground">
          By continuing you agree to the pinlay terms.
        </p>
      </form>
    </template>
  </AuthLayout>
</template>
