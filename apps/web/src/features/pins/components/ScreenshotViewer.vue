<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button, Icon } from "@pinlay/design";
import type { ApiPin, ApiAttachment } from "@/shared/lib/api";
import { timeAgo } from "@/shared/lib/format";

const props = defineProps<{
  pin: ApiPin;
  /** Full page URL — shown in the faux browser bar. Falls back to the
   *  anchor's stored path (which used to render a lone "/" on root pages). */
  pageUrl?: string;
}>();

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
  // Prefer the real page URL — "host/path" reads like a browser bar.
  if (props.pageUrl) {
    try {
      const u = new URL(props.pageUrl);
      return `${u.host}${u.pathname === "/" ? "" : u.pathname}`;
    } catch {
      /* fall through to the anchor path */
    }
  }
  const path = (anchor.value.urlPath ?? "").replace(/^\//, "");
  return path || "—";
});

const images = computed<ApiAttachment[]>(() =>
  (props.pin.attachments ?? []).filter(
    (a) => !a.contentType || a.contentType.startsWith("image/"),
  ),
);

const activeIndex = ref(0);
// Clamp when the pin (and its attachment list) changes — swapping to a pin
// with fewer attachments would otherwise leave activeIndex out of range.
watch(
  () => props.pin.id,
  () => {
    activeIndex.value = 0;
  },
);
watch(images, (list) => {
  if (activeIndex.value >= list.length) activeIndex.value = 0;
});

const activeImage = computed(() => images.value[activeIndex.value] ?? null);
</script>

<template>
  <div class="overflow-hidden rounded-2xl border bg-card">
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
        v-if="activeImage"
        :src="activeImage.url"
        :alt="activeImage.filename"
        class="absolute inset-0 size-full object-contain"
      />
      <div
        v-else
        class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/60"
      >
        <Icon name="image" :size="22" />
        <span class="text-[11px]">No screenshot</span>
      </div>

      <!-- N-of-M indicator, hidden with a single image -->
      <span
        v-if="images.length > 1"
        class="absolute right-2 top-2 rounded bg-background/90 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-sm ring-1 ring-border"
      >
        {{ activeIndex + 1 }} / {{ images.length }}
      </span>
    </div>

    <!-- thumbnail strip — only when there's more than one -->
    <div
      v-if="images.length > 1"
      class="flex gap-1.5 overflow-x-auto border-t bg-muted/30 p-2"
    >
      <button
        v-for="(att, i) in images"
        :key="att.id"
        type="button"
        class="relative size-14 shrink-0 overflow-hidden rounded border transition-colors"
        :class="
          i === activeIndex
            ? 'border-primary ring-1 ring-primary'
            : 'border-border hover:border-muted-foreground'
        "
        :aria-label="`Show ${att.filename}`"
        :aria-pressed="i === activeIndex"
        @click="activeIndex = i"
      >
        <img
          :src="att.url"
          :alt="att.filename"
          class="size-full object-cover"
          loading="lazy"
        />
      </button>
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
        v-if="activeImage"
        variant="ghost"
        size="icon-sm"
        class="ml-auto"
        title="Download"
        :as="'a'"
        :href="activeImage.url"
        :download="activeImage.filename"
      >
        <Icon name="download" :size="13" />
      </Button>
    </div>
  </div>
</template>
