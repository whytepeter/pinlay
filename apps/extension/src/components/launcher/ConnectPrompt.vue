<!--
  ConnectPrompt — "connect your workspace" panel rendered when no auth is
  stored. Used by the popup (filling the body) and the floating launcher menu
  (replacing the action list). The button opens the dashboard's connect page;
  the web app posts the session token back via the content-script bridge (no
  extension id needed).
-->
<template>
  <div class="px-4 py-5 text-center">
    <div
      class="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"
    >
      <Icon name="link" :size="16" :stroke-width="2" />
    </div>
    <p class="text-[13px] font-semibold text-foreground">Connect a workspace</p>
    <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
      pinlay needs a workspace to save and route pins.
    </p>
    <Button
      variant="default"
      size="sm"
      class="mt-3 w-full justify-center text-[12px]"
      @click="openConnect"
    >
      Connect workspace
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Button, Icon } from "@pinlay/design";
import { WEB_APP_URL } from "../../lib/env";
import { isExtensionAlive, safeSendMessage } from "../../lib/extension";

async function openConnect() {
  const url = `${WEB_APP_URL}/connect-extension`;
  if (!isExtensionAlive()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const sent = await safeSendMessage<{ ok: boolean }>({ type: "OPEN_TAB", url });
  if (!sent) window.open(url, "_blank", "noopener");
}
</script>
