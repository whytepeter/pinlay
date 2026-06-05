<!--
  AnnotationPinComposer
  ─────────────────────
  Inline popover anchored next to a freshly-dropped pin.

  Layout (matches the locked mockup):

    ┌──────────────────────────────────────────────────────┐
    │ [#05]  div.unknown                            [×]    │  ← header (soft violet)
    ├──────────────────────────────────────────────────────┤
    │ SEVERITY                                             │
    │ [● Critical] [● High] [● Medium*] [● Low]            │
    │                                                      │
    │ TYPE                                                 │
    │ [Visual*] [Layout] [Copy] [Broken] …                 │
    │                                                      │
    │ ┌──────────────────────────────────────────────┐     │
    │ │ One-line title…                              │     │
    │ └──────────────────────────────────────────────┘     │
    │ ┌──────────────────────────────────────────────┐     │
    │ │ Add detail, paste a Figma link, mention …    │     │
    │ │                                              │     │
    │ └──────────────────────────────────────────────┘     │
    ├──────────────────────────────────────────────────────┤
    │ [📷] [👤 NP]   → Linear     Cancel  [✈ Submit ⌘↵]   │  ← footer toolbar
    └──────────────────────────────────────────────────────┘

  Notes:
  • Severity pills tint with their own colour when active (medium = amber, etc.)
    so the active state visually encodes the severity itself.
  • Type pills use primary-soft for the active state (single hue).
  • Title + Description are two separate inputs in the form. The pin model
    keeps a single `comment` field; we join `title + "\n" + description`
    on emit. The detail popover splits the first line back into a title.
  • The markdown toolbar + labels chip input + body-assignee dropdown from
    the older version are gone — they pushed total height past the viewport
    on many pages.
-->
<template>
  <!-- IMPORTANT: no `transform` on this wrapper. A transformed ancestor
       becomes the containing block for `position: fixed` descendants, which
       breaks the full-viewport lightbox. We position with explicit `left`
       (computed as `clampedX - halfWidth`) instead of `translateX(-50%)`. -->
  <div
    ref="rootEl"
    class="pointer-events-auto absolute z-[2147483646] w-[360px] select-text"
    :style="popoverStyle"
    v-show="!capturing"
    @click.stop
    @keydown.stop
  >
    <div
      class="overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <!-- ── HEADER ─────────────────────────────────────────────────── -->
      <header
        class="flex items-center gap-2 border-b border-border bg-primary-soft/60 px-3 py-2"
      >
        <span
          class="inline-flex items-center rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary"
        >
          #{{ paddedIndex }}
        </span>
        <span
          v-if="selector"
          class="truncate font-mono text-[12px] text-foreground/80"
          :title="selector"
        >
          {{ selector }}
        </span>
        <button
          type="button"
          class="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          aria-label="Cancel pin"
          @click="emit('cancel')"
        >
          <Icon name="x" :size="13" :stroke-width="2" />
        </button>
      </header>

      <!-- ── BODY ──────────────────────────────────────────────────── -->
      <div class="space-y-3 p-3">
        <!-- Description (with mini markdown toolbar) -->
        <div class="relative rounded-md border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
          <div class="flex items-center gap-0.5 border-b border-border px-1.5 py-1">
            <button
              type="button"
              class="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Bold (⌘B)"
              @mousedown.prevent
              @click="applyBold"
            >
              <Icon name="bold" :size="12" :stroke-width="2.25" />
            </button>
            <button
              type="button"
              class="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Italic (⌘I)"
              @mousedown.prevent
              @click="applyItalic"
            >
              <Icon name="italic" :size="12" :stroke-width="2" />
            </button>
            <button
              type="button"
              :class="[
                'inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded border-0 p-0 transition-colors hover:bg-muted hover:text-foreground',
                linkOpen
                  ? 'bg-muted text-foreground'
                  : 'bg-transparent text-muted-foreground',
              ]"
              title="Insert link (⌘K)"
              @mousedown.prevent
              @click="openLinkPopover"
            >
              <Icon name="link" :size="12" :stroke-width="2" />
            </button>
          </div>

          <!-- Link popover -->
          <div
            v-if="linkOpen"
            class="absolute left-2 right-2 top-9 z-20 rounded-lg border border-border bg-popover p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
          >
            <div class="space-y-1.5">
              <input
                v-model="linkText"
                type="text"
                placeholder="Text"
                class="block w-full rounded-md border border-border bg-background px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                @keydown.enter.prevent="confirmLink"
                @keydown.escape.stop="cancelLink"
              />
              <input
                ref="linkUrlEl"
                v-model="linkUrl"
                type="url"
                placeholder="https://…"
                class="block w-full rounded-md border border-border bg-background px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                @keydown.enter.prevent="confirmLink"
                @keydown.escape.stop="cancelLink"
              />
            </div>
            <div class="mt-2 flex items-center justify-end gap-1.5">
              <Button variant="ghost" size="sm" class="h-6 px-2 text-[11px]" @click="cancelLink">Cancel</Button>
              <Button
                variant="default"
                size="sm"
                class="h-6 px-2 text-[11px]"
                :disabled="!linkUrl.trim()"
                @click="confirmLink"
                >Add link</Button
              >
            </div>
          </div>

          <!-- WYSIWYG editor: contenteditable div so the Bold/Italic/Link
               buttons apply real formatting INSIDE the input (no more raw
               **markdown** characters visible). On submit we convert the
               HTML back to markdown for storage so the wire shape doesn't
               change and existing pins still render. -->
          <div class="relative">
            <span
              v-if="isEditorEmpty"
              class="pointer-events-none absolute left-2.5 top-2 select-none text-[12.5px] leading-relaxed text-muted-foreground/60"
              aria-hidden="true"
            >
              What's wrong here? Paste a Figma link or @mention a teammate.
            </span>
            <div
              ref="commentEl"
              contenteditable="true"
              role="textbox"
              aria-multiline="true"
              aria-label="Pin description"
              class="block max-h-[200px] min-h-[60px] w-full resize-none overflow-y-auto border-0 bg-transparent px-2.5 py-2 text-[12.5px] leading-relaxed text-foreground outline-none focus:outline-none focus:ring-0"
              @input="onEditorInput"
              @paste="onEditorPaste"
              @keydown.meta.enter.prevent="onSubmit"
              @keydown.ctrl.enter.prevent="onSubmit"
              @keydown.meta.b.prevent.stop="applyBold"
              @keydown.ctrl.b.prevent.stop="applyBold"
              @keydown.meta.i.prevent.stop="applyItalic"
              @keydown.ctrl.i.prevent.stop="applyItalic"
              @keydown.meta.k.prevent.stop="openLinkPopover"
              @keydown.ctrl.k.prevent.stop="openLinkPopover"
            />
          </div>
        </div>

        <!-- Severity -->
        <div class="space-y-1.5">
          <label
            class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >Severity</label
          >
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="s in SEVERITIES"
              :key="s.value"
              type="button"
              :class="[
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors',
                severity === s.value
                  ? `${s.activeBorder} ${s.activeBg} text-foreground`
                  : 'border-border bg-background text-foreground/80 hover:bg-muted',
              ]"
              @click="severity = s.value"
            >
              <span
                :class="['h-1.5 w-1.5 rounded-full', s.dot]"
                aria-hidden="true"
              />
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Type (smaller pills) -->
        <div class="space-y-1.5">
          <label
            class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >Type</label
          >
          <div class="flex flex-wrap gap-1">
            <button
              v-for="t in ISSUE_TYPES"
              :key="t.value"
              type="button"
              :class="[
                'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                issueType === t.value
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border bg-background text-foreground/80 hover:bg-muted',
              ]"
              @click="issueType = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Attached image thumbnails -->
        <div v-if="images.length" class="flex flex-wrap gap-1.5">
          <button
            v-for="(img, i) in images"
            :key="i"
            type="button"
            class="group relative inline-flex h-10 w-10 cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
            :title="img.name"
            @click="imagePreviews[i] && (previewIdx = i)"
          >
            <img
              v-if="imagePreviews[i]"
              :src="imagePreviews[i]"
              alt=""
              class="h-full w-full object-cover"
            />
            <Icon
              v-else
              name="image"
              :size="14"
              :stroke-width="2"
              class="text-muted-foreground"
            />
            <!-- Hover dim + centered eye -->
            <span
              v-if="imagePreviews[i]"
              class="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/55 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Icon
                name="eye"
                :size="14"
                :stroke-width="2"
                class="text-card"
              />
            </span>
            <!-- Top-right X — z-10 so it sits above the dim layer; .stop so
                 the parent tile click doesn't ALSO open the lightbox. -->
            <span
              class="absolute right-0.5 top-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card text-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
              role="button"
              aria-label="Remove attachment"
              @click.stop="removeImage(i)"
            >
              <Icon name="x" :size="9" :stroke-width="2.5" />
            </span>
          </button>
        </div>

        <!-- Lightbox preview — covers the entire viewport above the popover.
             Mounted inside the composer's shadow root so styles resolve.
             Gallery: prev/next chevrons + counter pill when length > 1.
             Image scaled to 80vh / 80vw so the surround breathes. -->
        <Teleport :to="rootEl" :disabled="!rootEl">
          <div
            v-if="previewIdx !== null && imagePreviews[previewIdx]"
            class="pointer-events-auto fixed inset-0 z-[2147483647] flex items-center justify-center p-8"
            style="background: rgba(0, 0, 0, 0.85)"
            @click.self="previewIdx = null"
            @keydown.esc.prevent="previewIdx = null"
            @keydown.left.prevent="prevPreview"
            @keydown.right.prevent="nextPreview"
            tabindex="-1"
            ref="previewRoot"
          >
            <img
              :src="imagePreviews[previewIdx]"
              alt=""
              class="max-h-[80vh] max-w-[80vw] rounded-lg shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
            />

            <!-- Counter pill, top-center — only when gallery. -->
            <span
              v-if="imagePreviews.length > 1"
              class="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
            >
              {{ previewIdx + 1 }} / {{ imagePreviews.length }}
            </span>

            <!-- Prev / Next chevrons — only when gallery. -->
            <button
              v-if="imagePreviews.length > 1"
              type="button"
              class="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors hover:bg-card"
              aria-label="Previous image"
              @click.stop="prevPreview"
            >
              <Icon name="chevron-left" :size="18" :stroke-width="2" />
            </button>
            <button
              v-if="imagePreviews.length > 1"
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors hover:bg-card"
              aria-label="Next image"
              @click.stop="nextPreview"
            >
              <Icon name="chevron-right" :size="18" :stroke-width="2" />
            </button>

            <!-- Thumbnail strip — only when gallery. -->
            <div
              v-if="imagePreviews.length > 1"
              class="absolute bottom-4 left-1/2 -translate-x-1/2 flex max-w-[90vw] gap-1.5 overflow-x-auto rounded-lg bg-black/40 p-1.5 backdrop-blur-sm"
            >
              <button
                v-for="(src, i) in imagePreviews"
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
                <img :src="src" alt="" class="h-full w-full object-cover" />
              </button>
            </div>

            <button
              type="button"
              class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-background"
              aria-label="Close preview"
              @click="previewIdx = null"
            >
              <Icon name="x" :size="14" :stroke-width="2" />
            </button>
          </div>
        </Teleport>

        <!-- Error -->
        <div
          v-if="error"
          class="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive"
        >
          <Icon
            name="alert-circle"
            :size="11"
            :stroke-width="2"
            class="mt-px shrink-0"
          />
          {{ error }}
        </div>
      </div>

      <!-- ── FOOTER toolbar ───────────────────────────────────────── -->
      <footer
        class="flex items-center gap-1.5 border-t border-border px-2 py-2"
      >
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Attach screenshot of the page"
          :disabled="capturing"
          @click="takeScreenshot"
        >
          <Icon name="camera" :size="14" :stroke-width="2" />
        </button>

        <DropdownMenu v-if="members.length">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted"
              :title="
                selectedMember ? `Assigned to ${selectedMember.name}` : 'Assign'
              "
            >
              <span
                v-if="selectedMember"
                class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                :style="{
                  background: `oklch(0.55 0.16 ${memberHue(selectedMember.id)})`,
                }"
              >
                {{ initials(selectedMember.name) }}
              </span>
              <Icon
                v-else
                name="user-plus"
                :size="13"
                :stroke-width="2"
                class="text-muted-foreground"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            class="w-48"
            :to="rootEl ?? undefined"
          >
            <DropdownMenuItem @click="selectAssignee(null)">
              Unassigned
            </DropdownMenuItem>
            <DropdownMenuItem
              v-for="m in members"
              :key="m.id"
              @click="selectAssignee(m.id)"
            >
              <span
                class="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                :style="{ background: `oklch(0.55 0.16 ${memberHue(m.id)})` }"
              >
                {{ initials(m.name) }}
              </span>
              <span class="truncate">{{ m.name }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span
          class="ml-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground"
          title="Default integration"
        >
          <Icon name="arrow-right" :size="11" :stroke-width="2" />
          Linear
        </span>

        <div class="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 gap-1 px-2.5 text-[12px]"
            :disabled="submitting"
            @click="emit('cancel')"
            >Cancel</Button
          >
          <Button
            variant="default"
            size="sm"
            class="h-8 gap-1.5 px-2.5 text-[12px]"
            :disabled="!canSubmit"
            @click="onSubmit"
          >
            <Icon
              v-if="!submitting"
              name="send"
              :size="12"
              :stroke-width="2"
            />
            {{ submitting ? "Submitting…" : "Submit" }}
            <span
              class="rounded bg-primary-foreground/15 px-1 py-0.5 font-mono text-[9px] leading-none text-primary-foreground/85"
            >
              ⌘↵
            </span>
          </Button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
} from "@pinlay/design";
import type { Severity, PinType } from "@pinlay/shared";
import type { WorkspaceMember } from "../../lib/api";

export interface PinDraft {
  comment: string;
  severity: Severity;
  issueType: PinType;
  images: File[];
  assigneeId: string | null;
  labels: string[];
}

const props = defineProps<{
  index: number;
  pageX: number;
  pageY: number;
  /** Dev-tools-style label of the clicked element (e.g. `button[data-testid="…"]`). */
  selector?: string;
  submitting: boolean;
  error?: string;
  members: WorkspaceMember[];
}>();

const emit = defineEmits<{
  submit: [draft: PinDraft];
  cancel: [];
}>();

// ── Form state ──────────────────────────────────────────────────────────────
const description = ref("");
const severity = ref<Severity>("medium");
const issueType = ref<PinType>("visual");
const images = ref<File[]>([]);
const assigneeId = ref<string | null>(null);

// `description` holds the contenteditable's innerHTML. Strip tags + entities
// for the canSubmit check so an empty editor (just `<br>` etc) doesn't count.
const isEditorEmpty = computed(() => {
  const text = description.value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text === "";
});
// Comment is required — images alone don't justify a pin. The Submit
// button stays disabled until the editor has non-whitespace content.
const canSubmit = computed(
  () => !isEditorEmpty.value && !props.submitting,
);

const paddedIndex = computed(() => String(props.index).padStart(2, "0"));

// ── Severity (severity-tinted active state) ──────────────────────────────────
// Tailwind needs to SEE these class strings verbatim during the content scan,
// which it does because they're string literals here.
const SEVERITIES: {
  value: Severity;
  label: string;
  dot: string;
  activeBorder: string;
  activeBg: string;
}[] = [
  {
    value: "critical",
    label: "Critical",
    dot: "bg-sev-critical",
    activeBorder: "border-sev-critical",
    activeBg: "bg-sev-critical/10",
  },
  {
    value: "high",
    label: "High",
    dot: "bg-sev-high",
    activeBorder: "border-sev-high",
    activeBg: "bg-sev-high/10",
  },
  {
    value: "medium",
    label: "Medium",
    dot: "bg-sev-medium",
    activeBorder: "border-sev-medium",
    activeBg: "bg-sev-medium/15",
  },
  {
    value: "low",
    label: "Low",
    dot: "bg-sev-low",
    activeBorder: "border-sev-low",
    activeBg: "bg-sev-low/10",
  },
];

// ── Type (short labels) ──────────────────────────────────────────────────────
const ISSUE_TYPES: { value: PinType; label: string }[] = [
  { value: "visual", label: "Visual" },
  { value: "layout", label: "Layout" },
  { value: "copy", label: "Copy" },
  { value: "broken", label: "Broken" },
  { value: "missing", label: "Missing" },
  { value: "a11y", label: "A11y" },
  { value: "perf", label: "Perf" },
  { value: "other", label: "Other" },
];

// ── Assignee picker ─────────────────────────────────────────────────────────
const selectedMember = computed(() =>
  assigneeId.value
    ? (props.members.find((m) => m.id === assigneeId.value) ?? null)
    : null,
);
function selectAssignee(id: string | null) {
  assigneeId.value = id;
}
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "??"
  );
}
function memberHue(id: string): number {
  // Deterministic hue from id so each member's avatar stays consistent
  // across renders without needing a stored hue on the WorkspaceMember type.
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

// ── Image attachments ───────────────────────────────────────────────────────
function removeImage(i: number) {
  images.value.splice(i, 1);
}

// Object-URL previews so the attached-image chips render thumbnails.
const imagePreviews = ref<string[]>([]);
watch(
  images,
  (list) => {
    for (const url of imagePreviews.value) {
      if (!url) continue;
      const stillUsed = list.some((_, idx) => imagePreviews.value[idx] === url);
      if (!stillUsed) URL.revokeObjectURL(url);
    }
    imagePreviews.value = list.map((file, idx) => {
      const existing = imagePreviews.value[idx];
      if (existing) return existing;
      try {
        return URL.createObjectURL(file);
      } catch {
        return "";
      }
    });
  },
  { deep: true, immediate: true },
);
onBeforeUnmount(() => {
  for (const url of imagePreviews.value) {
    if (url) URL.revokeObjectURL(url);
  }
});

// ── Lightbox preview ────────────────────────────────────────────────────────
const previewIdx = ref<number | null>(null);
const previewRoot = ref<HTMLDivElement | null>(null);
// Focus the lightbox after it mounts so Esc + arrow keys work without a click.
watch(previewIdx, async (idx) => {
  if (idx === null) return;
  await nextTick();
  previewRoot.value?.focus();
});
function prevPreview() {
  if (previewIdx.value === null || imagePreviews.value.length < 2) return;
  const len = imagePreviews.value.length;
  previewIdx.value = (previewIdx.value - 1 + len) % len;
}
function nextPreview() {
  if (previewIdx.value === null || imagePreviews.value.length < 2) return;
  previewIdx.value = (previewIdx.value + 1) % imagePreviews.value.length;
}

// ── Screenshot capture (region-select flow) ──────────────────────────────────
// Click the camera → composer hides → content-script mounts the RegionSelector
// over the whole page. User drags a rectangle; content-script crops the
// visible-tab capture to that region and dispatches the dataUrl back via
// `pinlay:capture-region-result`. We attach it as a File to the pin's images.
const capturing = ref(false);

function takeScreenshot() {
  if (capturing.value) return;
  capturing.value = true;

  function onResult(ev: Event) {
    const detail = (ev as CustomEvent<{ dataUrl?: string; cancelled?: boolean }>).detail;
    window.removeEventListener("pinlay:capture-region-result", onResult);
    capturing.value = false;
    if (!detail || detail.cancelled || !detail.dataUrl) return;
    const file = dataUrlToFile(detail.dataUrl, `screenshot-${Date.now()}.png`);
    if (file) images.value.push(file);
  }

  window.addEventListener("pinlay:capture-region-result", onResult);
  window.dispatchEvent(new CustomEvent("pinlay:capture-region"));
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const [meta, b64] = dataUrl.split(",");
  if (!b64) return null;
  const mime = meta?.match(/:(.*?);/)?.[1] ?? "image/png";
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

// ── WYSIWYG editor helpers ───────────────────────────────────────────────────
// The description editor is a contenteditable div (NOT a textarea). Toolbar
// buttons + Cmd+B/I/K call document.execCommand on the live selection, so the
// user sees BOLD/italic/links applied IN PLACE — no raw `**text**` showing
// through. We keep storage as markdown (htmlToMarkdown on submit) so existing
// pins still render and the API contract is unchanged.
const commentEl = ref<HTMLDivElement | null>(null);

function syncFromEditor() {
  if (!commentEl.value) return;
  description.value = commentEl.value.innerHTML;
}
function onEditorInput() {
  syncFromEditor();
}
// Strip formatting on paste — pasting from Notion/Docs would otherwise drop
// fonts, sizes, and other styles into our minimal Bold/Italic/Link world.
function onEditorPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData("text/plain");
  if (text == null) return;
  e.preventDefault();
  document.execCommand("insertText", false, text);
  syncFromEditor();
}

function applyBold() {
  commentEl.value?.focus();
  document.execCommand("bold");
  syncFromEditor();
}
function applyItalic() {
  commentEl.value?.focus();
  document.execCommand("italic");
  syncFromEditor();
}

// Link popover — saves the current selection so the popover's inputs can
// take focus without losing the user's place. confirmLink restores the
// range then runs createLink (or inserts a labeled anchor when there's no
// selection to wrap).
const linkOpen = ref(false);
const linkText = ref("");
const linkUrl = ref("");
const linkUrlEl = ref<HTMLInputElement | null>(null);
let linkSelRange: Range | null = null;

function openLinkPopover() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    linkSelRange = sel.getRangeAt(0).cloneRange();
    linkText.value = sel.toString();
  } else {
    linkSelRange = null;
    linkText.value = "";
  }
  linkUrl.value = "";
  linkOpen.value = true;
  void nextTick(() => linkUrlEl.value?.focus());
}
function confirmLink() {
  const url = linkUrl.value.trim();
  if (!url) {
    linkOpen.value = false;
    return;
  }
  const editor = commentEl.value;
  if (!editor) {
    linkOpen.value = false;
    return;
  }

  // Validate the saved range still belongs to the editor — if focus moved
  // away and back, or Vue re-rendered, the original Range can become
  // detached and `Range.insertNode` would either no-op or throw.
  let range = linkSelRange;
  if (range) {
    const startOk = editor.contains(range.startContainer)
      || range.startContainer === editor;
    const endOk = editor.contains(range.endContainer)
      || range.endContainer === editor;
    if (!startOk || !endOk) range = null;
  }

  // Build the <a> element. Direct DOM construction is more reliable than
  // `execCommand('createLink'|'insertHTML')`, which fails silently when the
  // saved range loses validity across focus changes (esp. in shadow DOM).
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  const labelOverride = linkText.value.trim();
  let inserted = false;

  try {
    if (range && !range.collapsed) {
      if (labelOverride) {
        range.deleteContents();
        a.textContent = labelOverride;
        range.insertNode(a);
      } else {
        a.appendChild(range.extractContents());
        range.insertNode(a);
      }
      inserted = true;
    } else if (range) {
      // Caret-only selection — insert label-or-url at the cursor.
      a.textContent = labelOverride || url;
      range.insertNode(a);
      inserted = true;
    }
  } catch (err) {
    console.warn("[pinlay] link Range.insertNode failed:", err);
  }

  if (!inserted) {
    // Fallback: no saved range or insertNode failed → append at end. Always
    // succeeds, so the user's link never silently disappears.
    if (!a.textContent) a.textContent = labelOverride || url;
    editor.appendChild(a);
  }

  // Move the caret to just after the inserted anchor so the next keystroke
  // doesn't extend it. Use the editor's root selection (works across the
  // shadow-DOM boundary in Chrome).
  editor.focus();
  try {
    const after = document.createRange();
    after.setStartAfter(a);
    after.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(after);
  } catch {
    /* Selection placement is best-effort — the link is already inserted. */
  }

  syncFromEditor();
  linkOpen.value = false;
}
function cancelLink() {
  linkOpen.value = false;
}

/**
 * Convert the editor's HTML back to markdown for storage. Walks the DOM so
 * nested tags compose correctly (e.g. `<strong><em>foo</em></strong>`
 * becomes `**_foo_**`). Anything outside the {strong,em,a,br,div,p} set is
 * unwrapped to its text content — the editor never produces other tags, but
 * pasted markup would otherwise leak through.
 */
function htmlToMarkdown(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as Element;
    const inner = Array.from(el.childNodes).map(walk).join("");
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case "strong":
      case "b":
        return inner.length ? `**${inner}**` : "";
      case "em":
      case "i":
        return inner.length ? `_${inner}_` : "";
      case "a": {
        const href = el.getAttribute("href") ?? "";
        return `[${inner}](${href})`;
      }
      case "br":
        return "\n";
      case "div":
      case "p":
        return inner + "\n";
      default:
        return inner;
    }
  }
  return Array.from(tmp.childNodes)
    .map(walk)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Positioning ──────────────────────────────────────────────────────────────
const rootEl = ref<HTMLDivElement | null>(null);

// Clamp the popover so it never overflows the viewport. We compute the LEFT
// EDGE directly (`clampedX - halfWidth`) instead of using `translateX(-50%)`
// — a transformed ancestor becomes the containing block for `position: fixed`
// descendants, which would trap the lightbox inside the popover. Keep this
// wrapper transform-free.
const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT_ESTIMATE = 420;
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

// ── Submit ───────────────────────────────────────────────────────────────────
function onSubmit() {
  if (!canSubmit.value) return;
  emit("submit", {
    // Convert HTML to markdown so the API contract + existing pins are
    // unaffected — the editor is WYSIWYG but storage stays markdown.
    comment: htmlToMarkdown(description.value),
    severity: severity.value,
    issueType: issueType.value,
    images: images.value.slice(),
    assigneeId: assigneeId.value,
    labels: [],
  });
}
</script>

