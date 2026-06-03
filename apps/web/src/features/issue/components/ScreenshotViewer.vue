<script setup lang="ts">
import { computed } from "vue";
import { Button, Icon } from "@pinlay/design";
import type { ApiPin } from "@/shared/lib/api";
import { timeAgo } from "@/shared/lib/format";

const props = defineProps<{ pin: ApiPin }>();

interface AnchorMeta {
  urlPath?: string;
  viewport?: { width: number; height: number };
  devicePixelRatio?: number;
}

function readAnchor(): AnchorMeta {
  const a = props.pin.anchor as Record<string, unknown> | null | undefined;
  if (!a) return {};
  const vp = a.viewportSize as
    | { width?: unknown; height?: unknown }
    | undefined;
  return {
    urlPath: typeof a.urlPath === "string" ? a.urlPath : undefined,
    viewport:
      vp && typeof vp.width === "number" && typeof vp.height === "number"
        ? { width: vp.width, height: vp.height }
        : undefined,
    devicePixelRatio:
      typeof a.devicePixelRatio === "number" ? a.devicePixelRatio : undefined,
  };
}

const anchor = computed(() => readAnchor());

const url = computed(() => {
  const path = anchor.value.urlPath ?? "";
  return `${path || "/"}`.replace(/^\//, "") || "/";
});

const firstImage = computed(() => {
  const att = props.pin.attachments?.[0];
  if (!att) return null;
  if (att.contentType && !att.contentType.startsWith("image/")) return null;
  return att;
});
</script>

<template>
  <div class="overflow-hidden rounded-lg border bg-card">
    <!-- faux browser chrome -->
    <div class="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
      <span class="flex gap-1.5">
        <span class="size-2.5 rounded-full bg-[#ef4444]/70" />
        <span class="size-2.5 rounded-full bg-[#eab308]/70" />
        <span class="size-2.5 rounded-full bg-[#22c55e]/70" />
      </span>
      <span
        class="ml-1 flex-1 truncate rounded bg-background px-2 py-1 text-center font-mono text-[11px] text-muted-foreground"
        >{{ url }}</span
      >
    </div>

    <!-- canvas -->
    <div class="relative aspect-[16/9] w-full overflow-hidden bg-muted/50">
      <img
        v-if="firstImage"
        :src="firstImage.url"
        :alt="firstImage.filename"
        class="absolute inset-0 size-full object-contain"
      />
      <div
        v-else
        class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/60"
      >
        <Icon name="image" :size="22" />
        <span class="text-[11px]">No screenshot</span>
      </div>
    </div>

    <!-- caption -->
    <div
      class="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground"
    >
      <span v-if="anchor.viewport" class="mono"
        >{{ anchor.viewport.width }}×{{ anchor.viewport.height }}</span
      >
      <span v-if="anchor.devicePixelRatio" class="mono"
        >@{{ anchor.devicePixelRatio }}x</span
      >
      <span>Captured {{ timeAgo(pin.createdAt) }}</span>
      <Button
        v-if="firstImage"
        variant="ghost"
        size="icon-sm"
        class="ml-auto"
        title="Download"
        :as="'a'"
        :href="firstImage.url"
        :download="firstImage.filename"
      >
        <Icon name="download" :size="13" />
      </Button>
    </div>
  </div>
</template>
