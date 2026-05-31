<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Button, Brand, Icon } from "@pinlay/design";
import { useAuth } from "@/shared/composables/useAuth";
import { connectExtension } from "@/shared/lib/extension-bridge";

const router = useRouter();
const { token, user } = useAuth();

type State = "connecting" | "connected" | "not-installed" | "error";
const state = ref<State>("connecting");
const detail = ref<string>("");

async function attempt() {
  state.value = "connecting";
  detail.value = "";
  if (!token.value || !user.value) {
    // Guard guarantees auth, but be defensive.
    await router.replace({ name: "login", query: { redirect: "/connect-extension" } });
    return;
  }
  const res = await connectExtension({
    token: token.value,
    userId: user.value.id,
    orgId: user.value.orgId,
  });
  if (res.notInstalled) {
    state.value = "not-installed";
  } else if (res.ok) {
    state.value = "connected";
  } else {
    state.value = "error";
    detail.value = res.error ?? "The extension rejected the connection.";
  }
}

onMounted(attempt);
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
    <div
      class="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
    >
      <!-- icon medallion -->
      <div
        class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        :class="{
          'bg-primary/10 text-primary': state === 'connecting' || state === 'connected',
          'bg-amber-500/10 text-amber-600': state === 'not-installed',
          'bg-destructive/10 text-destructive': state === 'error',
        }"
      >
        <Icon
          v-if="state === 'connecting'"
          name="loader-circle"
          :size="26"
          class="animate-spin"
        />
        <Icon v-else-if="state === 'connected'" name="check" :size="28" />
        <Icon v-else-if="state === 'not-installed'" name="puzzle" :size="26" />
        <Icon v-else name="circle-alert" :size="26" />
      </div>

      <!-- Connecting -->
      <template v-if="state === 'connecting'">
        <h1 class="text-[19px] font-semibold tracking-tight text-foreground">
          Connecting your extension…
        </h1>
        <p class="mx-auto mt-2 max-w-xs text-[13.5px] text-muted-foreground">
          Handing your session to the pinlay browser extension. This only takes a
          moment.
        </p>
      </template>

      <!-- Connected -->
      <template v-else-if="state === 'connected'">
        <h1 class="text-[19px] font-semibold tracking-tight text-foreground">
          Extension connected
        </h1>
        <p class="mx-auto mt-2 max-w-xs text-[13.5px] text-muted-foreground">
          You're signed in as
          <span class="font-medium text-foreground">{{ user?.email }}</span
          >. You can close this tab and start dropping pins on any page.
        </p>
        <div class="mt-6 flex flex-col gap-2">
          <Button class="w-full" @click="router.replace('/')">
            Go to dashboard
          </Button>
        </div>
      </template>

      <!-- Not installed -->
      <template v-else-if="state === 'not-installed'">
        <h1 class="text-[19px] font-semibold tracking-tight text-foreground">
          Extension not detected
        </h1>
        <p class="mx-auto mt-2 max-w-xs text-[13.5px] text-muted-foreground">
          We couldn't reach the pinlay extension on this page. Install it, then
          reload and try again.
        </p>
        <div class="mt-6 flex flex-col gap-2">
          <Button class="w-full" @click="attempt">
            <Icon name="refresh-cw" :size="15" />
            Try again
          </Button>
          <Button variant="outline" class="w-full" @click="router.replace('/')">
            Skip for now
          </Button>
        </div>
      </template>

      <!-- Error -->
      <template v-else>
        <h1 class="text-[19px] font-semibold tracking-tight text-foreground">
          Connection failed
        </h1>
        <p class="mx-auto mt-2 max-w-xs text-[13.5px] text-muted-foreground">
          {{ detail }}
        </p>
        <div class="mt-6 flex flex-col gap-2">
          <Button class="w-full" @click="attempt">
            <Icon name="refresh-cw" :size="15" />
            Try again
          </Button>
        </div>
      </template>

      <p
        class="mt-6 flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground"
      >
        <Brand :size="13" />
        pinlay
      </p>
    </div>
  </div>
</template>
