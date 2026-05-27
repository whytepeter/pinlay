<script setup lang="ts">
import { computed } from "vue";
import { Button, Icon } from "@pinlay/design";
import { type PinItem } from "@/shared/lib/data";
import { timeAgo } from "@/shared/lib/format";

const props = defineProps<{ pin: PinItem }>();

const anchor = computed(() => props.pin.anchor);
const url = computed(() => `app.acme.com${props.pin.anchor?.urlPath ?? ""}`);
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
      <!-- placeholder until a real captured screenshot is wired in -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/60"
      >
        <Icon name="image" :size="22" />
        <span class="text-[11px]">Screenshot</span>
      </div>
      <!-- pinned element outline + pulsing marker -->
      <div
        class="absolute rounded-md border-2 border-dashed border-primary"
        style="left: 56%; top: 58%; width: 30%; height: 20%"
      />
      <div
        class="mono absolute flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
        style="left: 54%; top: 53%; animation: pulse-glow 1.6s ease-in-out infinite"
      >
        {{ pin.index }}
      </div>
    </div>

    <!-- caption -->
    <div
      class="flex items-center gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground"
    >
      <span class="mono"
        >{{ anchor?.viewportSize.width }}×{{ anchor?.viewportSize.height }}</span
      >
      <span class="mono">@{{ anchor?.devicePixelRatio }}x</span>
      <span>Captured {{ timeAgo(pin.createdAt) }}</span>
      <Button variant="ghost" size="icon-sm" class="ml-auto" title="Download">
        <Icon name="download" :size="13" />
      </Button>
    </div>
  </div>
</template>
