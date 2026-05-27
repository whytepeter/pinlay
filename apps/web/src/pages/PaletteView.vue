<script setup lang="ts">
interface Swatch {
  label: string;
  hex: string;
}
interface Palette {
  name: string;
  accent: string;
  accentHover: string;
  border: string;
  surfaces: Swatch[];
  text: Swatch[];
}

const ZINC: Swatch[] = [
  { label: "Page", hex: "#fafafa" },
  { label: "Card", hex: "#ffffff" },
  { label: "Muted", hex: "#f4f4f5" },
  { label: "Elevated", hex: "#e4e4e7" },
];
const SLATE: Swatch[] = [
  { label: "Page", hex: "#f8fafc" },
  { label: "Card", hex: "#ffffff" },
  { label: "Muted", hex: "#f1f5f9" },
  { label: "Elevated", hex: "#e2e8f0" },
];
const NEUTRAL: Swatch[] = [
  { label: "Page", hex: "#fafafa" },
  { label: "Card", hex: "#ffffff" },
  { label: "Muted", hex: "#f5f5f5" },
  { label: "Elevated", hex: "#e5e5e5" },
];

const ZINC_TEXT: Swatch[] = [
  { label: "Primary", hex: "#09090b" },
  { label: "Secondary", hex: "#71717a" },
  { label: "Muted", hex: "#a1a1aa" },
];
const SLATE_TEXT: Swatch[] = [
  { label: "Primary", hex: "#020617" },
  { label: "Secondary", hex: "#64748b" },
  { label: "Muted", hex: "#94a3b8" },
];
const NEUTRAL_TEXT: Swatch[] = [
  { label: "Primary", hex: "#0a0a0a" },
  { label: "Secondary", hex: "#737373" },
  { label: "Muted", hex: "#a3a3a3" },
];

const palettes: Palette[] = [
  { name: "Blue · Zinc", accent: "#2563eb", accentHover: "#1d4ed8", border: "#e4e4e7", surfaces: ZINC, text: ZINC_TEXT },
  { name: "Indigo · Zinc", accent: "#4f46e5", accentHover: "#4338ca", border: "#e4e4e7", surfaces: ZINC, text: ZINC_TEXT },
  { name: "Teal · Slate", accent: "#0d9488", accentHover: "#0f766e", border: "#e2e8f0", surfaces: SLATE, text: SLATE_TEXT },
  { name: "Emerald · Slate", accent: "#059669", accentHover: "#047857", border: "#e2e8f0", surfaces: SLATE, text: SLATE_TEXT },
  { name: "Rose · Zinc", accent: "#e11d48", accentHover: "#be123c", border: "#e4e4e7", surfaces: ZINC, text: ZINC_TEXT },
  { name: "Monochrome · Neutral", accent: "#18181b", accentHover: "#000000", border: "#e5e5e5", surfaces: NEUTRAL, text: NEUTRAL_TEXT },
];

const severity: Swatch[] = [
  { label: "critical", hex: "#ef4444" },
  { label: "high", hex: "#f97316" },
  { label: "medium", hex: "#eab308" },
  { label: "low", hex: "#3b82f6" },
];
</script>

<template>
  <div style="background: #fafafa; color: #09090b" class="min-h-screen font-sans">
    <div class="mx-auto max-w-[1100px] p-8">
      <h1 class="text-xl font-semibold tracking-tight">Pick a palette</h1>
      <p class="mb-6 text-sm" style="color: #71717a">
        Light-first, cool neutrals — replacing the warm amber + stone. Tell me a
        name (e.g. "Blue · Zinc") and I'll apply it.
      </p>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="p in palettes"
          :key="p.name"
          class="flex flex-col gap-3 rounded-xl border p-4"
          style="background: #ffffff"
          :style="{ borderColor: p.border }"
        >
          <div class="flex items-baseline justify-between">
            <span class="text-sm font-semibold">{{ p.name }}</span>
            <span class="font-mono text-[11px]" style="color: #71717a">{{
              p.accent
            }}</span>
          </div>

          <!-- accent -->
          <div class="flex items-center gap-2">
            <div
              class="flex h-10 flex-1 items-center rounded-md px-3 text-xs font-medium text-white"
              :style="{ background: p.accent }"
            >
              Primary / accent
            </div>
            <div
              class="h-10 w-10 rounded-md"
              :style="{ background: p.accentHover }"
              title="hover"
            />
          </div>

          <!-- surfaces -->
          <div class="flex gap-1.5">
            <div
              v-for="s in p.surfaces"
              :key="s.label"
              class="h-8 flex-1 rounded border"
              :style="{ background: s.hex, borderColor: p.border }"
              :title="`${s.label} ${s.hex}`"
            />
          </div>

          <!-- text -->
          <div class="leading-tight">
            <div class="text-sm" :style="{ color: p.text[0].hex }">
              Primary text
            </div>
            <div class="text-xs" :style="{ color: p.text[1].hex }">
              Secondary text
            </div>
            <div class="text-xs" :style="{ color: p.text[2].hex }">
              Muted caption
            </div>
          </div>

          <!-- severity -->
          <div class="flex items-center gap-2">
            <span
              v-for="sev in severity"
              :key="sev.label"
              class="h-3 w-3 rounded-full"
              :style="{ background: sev.hex }"
              :title="sev.label"
            />
            <span class="text-[11px]" :style="{ color: p.text[1].hex }"
              >severity</span
            >
          </div>

          <!-- mini buttons in context -->
          <div class="flex gap-2 pt-1">
            <span
              class="rounded-md px-2.5 py-1 text-xs font-medium text-white"
              :style="{ background: p.accent }"
              >Primary</span
            >
            <span
              class="rounded-md border px-2.5 py-1 text-xs font-medium"
              :style="{
                background: p.surfaces[2].hex,
                borderColor: p.border,
                color: p.text[0].hex,
              }"
              >Secondary</span
            >
            <span
              class="rounded-md px-2.5 py-1 text-xs font-medium"
              :style="{ color: p.accent }"
              >Link</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
