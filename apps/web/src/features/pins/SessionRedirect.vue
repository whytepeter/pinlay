<script setup lang="ts">
/**
 * Legacy /s/:id → /p/:pinId shim. Old links (extension "Open in dashboard",
 * copied URLs, emails) point at the issue route; the rebuilt dashboard is
 * pin-centric, so we resolve the issue and forward to its first pin.
 */
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Icon } from "@pinlay/design";
import { apiClient } from "@/shared/lib/api";

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  try {
    const issue = await apiClient.issues.get(String(route.params.id));
    const first = issue.pins[0];
    if (first) {
      void router.replace(`/p/${first.id}`);
      return;
    }
  } catch {
    /* fall through to the feed */
  }
  void router.replace("/");
});
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center">
    <Icon name="loader-circle" :size="20" class="animate-spin text-muted-foreground" />
  </div>
</template>
