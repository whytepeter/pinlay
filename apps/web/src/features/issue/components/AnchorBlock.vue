<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@pinlay/design";

const props = defineProps<{
  anchor: Record<string, unknown>;
  stale?: boolean;
}>();

const open = ref(true);

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

const selector = computed(() => str(props.anchor.selector) ?? "—");

const rows = computed<[string, string][]>(() => {
  const a = props.anchor;
  const out: [string, string][] = [];

  const tag = str(a.tag);
  if (tag) out.push(["Tag", tag]);

  const role = str(a.role);
  out.push(["Role", role ?? "—"]);

  const sel = str(a.selector);
  if (sel) out.push(["CSS selector", sel]);

  const xpath = str(a.xpath);
  if (xpath) out.push(["XPath", xpath]);

  const text =
    str(a.textFingerprint) ??
    str(a.accessibleName) ??
    null;
  out.push(["Text", text ?? "—"]);

  const bb = a.boundingBox as
    | { x?: unknown; y?: unknown; width?: unknown; height?: unknown }
    | undefined;
  if (
    bb &&
    typeof bb.x === "number" &&
    typeof bb.y === "number" &&
    typeof bb.width === "number" &&
    typeof bb.height === "number"
  ) {
    out.push([
      "Bounding box",
      `${bb.x}, ${bb.y} · ${bb.width}×${bb.height}`,
    ]);
  }

  const vp = a.viewportSize as
    | { width?: unknown; height?: unknown }
    | undefined;
  const dpr = a.devicePixelRatio;
  if (vp && typeof vp.width === "number" && typeof vp.height === "number") {
    const dprPart = typeof dpr === "number" ? ` @${dpr}x` : "";
    out.push(["Captured", `${vp.width}×${vp.height}${dprPart}`]);
  }

  return out;
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
        selector
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
