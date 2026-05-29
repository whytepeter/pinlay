<!--
  AnnotationPinDetail
  ───────────────────
  Popover for an existing pin in VIEW mode. Layout:

    ┌──────────────────────────────────────────────────────┐
    │ [#01]  •  [visual]            [● Open] [×]           │  ← header
    ├──────────────────────────────────────────────────────┤
    │ Title                                                │
    │ Description …                                        │
    │                                                      │
    │ [thumb]  📷 Screenshot  [+1]                         │  ← attachments (if any)
    │          336×48  ·  84 KB                            │
    │                                                      │
    │ ⓐ  Ren  ·  12m ago                                   │  ← author + createdAt
    ├──────────────────────────────────────────────────────┤
    │ [⌒ Activity]  [↩ Reply]              [✓ Resolve]     │  ← footer
    └──────────────────────────────────────────────────────┘

  • #N pill: primary-soft surface, mono font (mirrors the composer header).
  • Severity → just a dot. Type → muted card-bg pill.
  • Status lives in the header as a DropdownMenu trigger (replaces the old
    body Select). Changing status emits 'change-status'.
  • Resolve in the footer is a primary affordance; flips to Re-open when the
    pin is already resolved.
  • Stale notice + Re-anchor button only render when `stale` is true.

  Title vs Description: the comment's first line is treated as the title, the
  rest (if any) as the description. Keeps the schema single-field but lets the
  UI render the hierarchy cleanly.
-->
<template>
  <!-- No `transform` on this wrapper — a transformed ancestor traps
       `position: fixed` descendants (lightbox) inside its bounds. Centring
       is baked into the computed `left` in popoverStyle. -->
  <div
    ref="rootEl"
    class="absolute z-[2147483646] w-[320px] select-text pointer-events-auto"
    :style="popoverStyle"
    @click.stop
  >
    <div
      class="overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <!-- ── HEADER ─────────────────────────────────────────────────── -->
      <header class="flex items-center gap-2 px-3 py-2.5">
        <span
          class="inline-flex items-center rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary"
        >
          #{{ paddedIndex }}
        </span>
        <span
          :class="['h-1.5 w-1.5 shrink-0 rounded-full', severityDot]"
          :title="severity ?? ''"
        />
        <span
          v-if="issueType"
          class="inline-flex items-center rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
        >
          {{ formatType(issueType) }}
        </span>

        <div class="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                :disabled="updating"
                class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span :class="['h-1.5 w-1.5 rounded-full', statusDot]" />
                {{ formatStatus(status) }}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              class="w-40"
              :to="rootEl ?? undefined"
            >
              <DropdownMenuItem
                v-for="opt in STATUS_OPTS"
                :key="opt.value"
                @click="onStatusChange(opt.value)"
              >
                <span
                  :class="['h-1.5 w-1.5 rounded-full', STATUS_DOT[opt.value]]"
                />
                {{ opt.label }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close pin detail"
            @click="emit('close')"
          >
            <Icon name="x" :size="13" :stroke-width="2" />
          </button>
        </div>
      </header>

      <Separator />

      <!-- ── BODY ──────────────────────────────────────────────────── -->
      <div class="space-y-3 p-3">
        <!-- Stale notice (only when the anchor element can't be re-resolved). -->
        <div
          v-if="stale"
          class="flex items-start gap-2 rounded-md border border-status-stale/30 bg-status-stale/10 px-2.5 py-2 text-[11px] text-status-stale"
        >
          <Icon
            name="alert-triangle"
            :size="12"
            :stroke-width="2"
            class="mt-px shrink-0"
          />
          <div class="flex-1">
            <p>
              Original element not found on this page. Re-anchor to point it at
              the new element.
            </p>
            <button
              type="button"
              class="mt-1.5 inline-flex items-center gap-1 rounded-md border border-status-stale/40 px-2 py-0.5 text-[10px] font-medium transition-colors hover:bg-status-stale/15"
              @click="emit('reanchor')"
            >
              <Icon name="crosshair" :size="10" :stroke-width="2" />
              Re-anchor
            </button>
          </div>
        </div>

        <!-- Title + description (derived from the comment's first line). -->
        <div v-if="titleText || descriptionText" class="space-y-1.5">
          <h3
            v-if="titleText"
            class="text-[14px] font-semibold leading-snug text-foreground"
          >
            {{ titleText }}
          </h3>
          <p
            v-if="descriptionText"
            class="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground"
          >
            {{ descriptionText }}
          </p>
        </div>

        <!-- Attachments card -->
        <div
          v-if="primaryAttachment"
          class="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2"
        >
          <button
            type="button"
            class="group relative h-12 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-border bg-card"
            :title="`Preview ${primaryAttachment.ext}`"
            @click="openPreview(0)"
          >
            <img
              :src="primaryAttachment.dataUrl"
              alt=""
              class="h-full w-full object-cover"
            />
            <span
              class="absolute left-1 top-1 rounded bg-foreground/85 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-card"
            >
              {{ primaryAttachment.ext }}
            </span>
            <!-- Hover dim + centered eye -->
            <span
              class="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/55 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Icon
                name="eye"
                :size="16"
                :stroke-width="2"
                class="text-card"
              />
            </span>
          </button>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <Icon name="camera" :size="12" :stroke-width="2" class="text-primary" />
              <span class="text-[13px] font-medium text-foreground">
                Screenshot
              </span>
              <span
                v-if="attachments && attachments.length > 1"
                class="inline-flex items-center rounded-md bg-primary-soft px-1 py-0 text-[10px] font-semibold text-primary"
              >
                +{{ attachments.length - 1 }}
              </span>
            </div>
            <div class="mt-0.5 text-[11px] text-muted-foreground">
              {{ primaryAttachment.dimensionsLabel }}
              <span
                v-if="primaryAttachment.dimensionsLabel && primaryAttachment.sizeLabel"
                class="px-0.5"
                >·</span
              >
              {{ primaryAttachment.sizeLabel }}
            </div>
          </div>
        </div>

        <!-- Author + relative time -->
        <div v-if="author" class="flex items-center gap-1.5">
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold text-white"
            :style="{ background: authorBg }"
          >
            {{ authorInitials }}
          </span>
          <span class="text-[11px] font-medium text-foreground">
            {{ author.name }}
          </span>
          <span v-if="relativeTime" class="text-[11px] text-muted-foreground/70"
            >·</span
          >
          <span v-if="relativeTime" class="text-[11px] text-muted-foreground">
            {{ relativeTime }}
          </span>
        </div>
      </div>

    </div>

    <!-- Lightbox preview — covers the entire viewport above the popover.
         Teleport'd into the popover's rootEl so it stays inside the shadow
         root (where the stylesheet WXT injected actually applies). Gallery
         nav when more than one attachment. Image scaled to 80vh / 80vw. -->
    <Teleport :to="rootEl" :disabled="!rootEl">
      <div
        v-if="previewIdx !== null && previewAttachment"
        ref="previewRoot"
        class="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center p-8"
        style="background: rgba(0, 0, 0, 0.85)"
        tabindex="-1"
        @click.self="closePreview"
        @keydown.esc.prevent="closePreview"
        @keydown.left.prevent="prevPreview"
        @keydown.right.prevent="nextPreview"
      >
        <img
          :src="previewAttachment.dataUrl"
          alt=""
          class="max-h-[80vh] max-w-[80vw] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
        />

        <!-- Counter pill, top-center — only when gallery. -->
        <span
          v-if="renderedAttachments.length > 1"
          class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
        >
          {{ previewIdx + 1 }} / {{ renderedAttachments.length }}
        </span>

        <!-- Prev / Next chevrons — only when gallery. -->
        <button
          v-if="renderedAttachments.length > 1"
          type="button"
          class="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors hover:bg-card"
          aria-label="Previous image"
          @click.stop="prevPreview"
        >
          <Icon name="chevron-left" :size="18" :stroke-width="2" />
        </button>
        <button
          v-if="renderedAttachments.length > 1"
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors hover:bg-card"
          aria-label="Next image"
          @click.stop="nextPreview"
        >
          <Icon name="chevron-right" :size="18" :stroke-width="2" />
        </button>

        <!-- Thumbnail strip — only when gallery. -->
        <div
          v-if="renderedAttachments.length > 1"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 flex max-w-[90vw] gap-1.5 overflow-x-auto rounded-lg bg-black/40 p-1.5 backdrop-blur-sm"
        >
          <button
            v-for="(a, i) in renderedAttachments"
            :key="i"
            type="button"
            :aria-label="`Go to image ${i + 1}`"
            :class="[
              'h-12 w-12 shrink-0 overflow-hidden rounded-md transition-all',
              i === previewIdx
                ? 'ring-2 ring-white scale-105'
                : 'opacity-60 hover:opacity-100',
            ]"
            @click.stop="previewIdx = i"
          >
            <img :src="a.dataUrl" alt="" class="h-full w-full object-cover" />
          </button>
        </div>

        <button
          type="button"
          class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-background"
          aria-label="Close preview"
          @click="closePreview"
        >
          <Icon name="x" :size="14" :stroke-width="2" />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Separator,
} from "@pinlay/design";
import type { Severity, Status } from "@pinlay/shared";

export interface PinAttachment {
  name: string;
  mime: string;
  dataUrl: string;
  size: number; // bytes
  dimensions?: { w: number; h: number };
}

const props = defineProps<{
  index: number;
  pageX: number;
  pageY: number;
  comment: string;
  severity: Severity | null;
  issueType: string | null;
  status: Status;
  attachments?: PinAttachment[];
  author?: { name: string; avatarHue?: number };
  createdAt?: string;
  updating?: boolean;
  stale?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  reanchor: [];
  "change-status": [status: Status];
}>();

// ── Title / description split ────────────────────────────────────────────────
const titleText = computed(() => {
  const c = (props.comment ?? "").trim();
  if (!c) return "";
  const idx = c.indexOf("\n");
  return idx === -1 ? c : c.slice(0, idx).trim();
});
const descriptionText = computed(() => {
  const c = (props.comment ?? "").trim();
  const idx = c.indexOf("\n");
  return idx === -1 ? "" : c.slice(idx + 1).trim();
});

// ── #N pad ───────────────────────────────────────────────────────────────────
const paddedIndex = computed(() =>
  String(props.index).padStart(2, "0"),
);

// ── Severity / status visuals ────────────────────────────────────────────────
const SEVERITY_DOT: Record<Severity, string> = {
  low: "bg-sev-low",
  medium: "bg-sev-medium",
  high: "bg-sev-high",
  critical: "bg-sev-critical",
};
const severityDot = computed(() =>
  props.severity ? SEVERITY_DOT[props.severity] : "bg-muted",
);

const STATUS_OPTS: { value: Status; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const STATUS_DOT: Record<string, string> = {
  open: "bg-status-open",
  in_progress: "bg-status-progress",
  resolved: "bg-status-resolved",
  draft: "bg-muted",
  archived: "bg-muted",
};
const statusDot = computed(() => STATUS_DOT[props.status] ?? "bg-muted");

function formatStatus(s: Status): string {
  return s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
function formatType(t: string): string {
  return t.replace(/_/g, " ");
}
function onStatusChange(next: Status) {
  if (next !== props.status) emit("change-status", next);
}

// ── Attachments ──────────────────────────────────────────────────────────────
interface RenderedAttachment {
  dataUrl: string;
  ext: string;
  dimensionsLabel: string;
  sizeLabel: string;
}
function renderAttachment(a: PinAttachment): RenderedAttachment {
  const ext =
    a.name.split(".").pop()?.toUpperCase() ??
    a.mime.split("/").pop()?.toUpperCase() ??
    "FILE";
  const dimensionsLabel = a.dimensions
    ? `${a.dimensions.w}×${a.dimensions.h}`
    : "";
  return {
    dataUrl: a.dataUrl,
    ext,
    dimensionsLabel,
    sizeLabel: formatBytes(a.size),
  };
}
const renderedAttachments = computed<RenderedAttachment[]>(
  () => props.attachments?.map(renderAttachment) ?? [],
);
const primaryAttachment = computed<RenderedAttachment | null>(
  () => renderedAttachments.value[0] ?? null,
);

function formatBytes(bytes: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

// ── Author ───────────────────────────────────────────────────────────────────
const authorInitials = computed(() => {
  const name = props.author?.name ?? "";
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??";
});
const authorBg = computed(() => {
  const hue = props.author?.avatarHue ?? 264; // violet-ish default
  return `oklch(0.55 0.16 ${hue})`;
});

// ── Relative time ────────────────────────────────────────────────────────────
const relativeTime = computed(() => {
  if (!props.createdAt) return "";
  const then = new Date(props.createdAt).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
});

// ── Positioning ──────────────────────────────────────────────────────────────
const rootEl = ref<HTMLElement | null>(null);

// ── Lightbox preview ────────────────────────────────────────────────────────
// `previewIdx` indexes renderedAttachments. null = closed. Gallery nav when
// renderedAttachments.length > 1.
const previewIdx = ref<number | null>(null);
const previewRoot = ref<HTMLDivElement | null>(null);
function openPreview(i: number) {
  if (!renderedAttachments.value[i]) return;
  previewIdx.value = i;
}
function closePreview() {
  previewIdx.value = null;
}
function prevPreview() {
  if (previewIdx.value === null || renderedAttachments.value.length < 2) return;
  const len = renderedAttachments.value.length;
  previewIdx.value = (previewIdx.value - 1 + len) % len;
}
function nextPreview() {
  if (previewIdx.value === null || renderedAttachments.value.length < 2) return;
  previewIdx.value = (previewIdx.value + 1) % renderedAttachments.value.length;
}
watch(previewIdx, async (idx) => {
  if (idx === null) return;
  await nextTick();
  previewRoot.value?.focus();
});
const previewAttachment = computed(() =>
  previewIdx.value === null
    ? null
    : renderedAttachments.value[previewIdx.value] ?? null,
);

// Same edge-clamp + transform-free positioning as the composer. Computing
// the LEFT EDGE directly keeps `position: fixed` descendants (the lightbox)
// anchored to the viewport instead of the popover.
const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT_ESTIMATE = 320;
const EDGE_MARGIN = 12;

const popoverStyle = computed<Record<string, string>>(() => {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const halfW = POPOVER_WIDTH / 2;

  const minCenterX = EDGE_MARGIN + halfW;
  const maxCenterX = viewportW - EDGE_MARGIN - halfW;
  const centerX =
    maxCenterX < minCenterX
      ? viewportW / 2
      : Math.max(minCenterX, Math.min(props.pageX, maxCenterX));
  const left = centerX - halfW;

  const flipAbove =
    props.pageY + 24 + POPOVER_HEIGHT_ESTIMATE > viewportH;
  if (flipAbove) {
    const top = Math.max(
      EDGE_MARGIN,
      props.pageY - 24 - POPOVER_HEIGHT_ESTIMATE,
    );
    return { left: `${left}px`, top: `${top}px` };
  }
  return { left: `${left}px`, top: `${props.pageY + 24}px` };
});
</script>
