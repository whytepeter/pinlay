<script setup lang="ts">
import { computed, ref } from "vue";
import type { Anchor } from "@pinlay/shared";
import { Icon } from "@pinlay/design";

const props = defineProps<{ anchor: Anchor; stale?: boolean }>();

const open = ref(true);

const rows = computed<[string, string][]>(() => {
  const a = props.anchor;
  return [
    ["Tag", a.tag],
    ["Role", a.role ?? "—"],
    ["CSS selector", a.selector],
    ["XPath", a.xpath],
    ["Text", a.textFingerprint ?? "—"],
    [
      "Bounding box",
      `${a.boundingBox.x}, ${a.boundingBox.y} · ${a.boundingBox.width}×${a.boundingBox.height}`,
    ],
    [
      "Captured",
      `${a.viewportSize.width}×${a.viewportSize.height} @${a.devicePixelRatio}x`,
    ],
  ];
});
</script>

<template>
  <div class="rounded-lg border bg-card">
    <button
      type="button"
      class="flex w-full items-center gap-2 px-4 py-3 text-left"
      @click="open = !open"
    >
      <Icon
        name="mouse-pointer-2"
        :size="15"
        :class="stale ? 'text-[color:var(--status-stale)]' : 'text-primary'"
      />
      <span class="text-sm font-medium">Anchor</span>
      <span class="truncate font-mono text-[11px] text-muted-foreground">{{
        anchor.selector
      }}</span>
      <span
        class="ml-auto flex shrink-0 items-center gap-1 text-[11px]"
        :class="
          stale
            ? 'text-[color:var(--status-stale)]'
            : 'text-[color:var(--status-resolved)]'
        "
      >
        <Icon :name="stale ? 'triangle-alert' : 'check'" :size="13" />
        {{ stale ? "Element not found" : "Resolves" }}
      </span>
      <Icon
        name="chevron-down"
        :size="15"
        class="shrink-0 text-muted-foreground transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <div
      v-if="open"
      class="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 border-t px-4 py-3 text-[12px]"
    >
      <template v-for="r in rows" :key="r[0]">
        <span class="text-muted-foreground">{{ r[0] }}</span>
        <span class="mono break-all text-foreground">{{ r[1] }}</span>
      </template>
    </div>
  </div>
</template>
