/**
 * useMarkupCanvas
 * ───────────────
 * Composable that owns drawing state for the screenshot markup editor.
 *
 * Storage model: shape-based (vector). Every drawn item is appended to
 * `shapes[]`. The canvas is the screenshot + every shape replayed on top —
 * so the select tool can hit-test, highlight, and delete individual items
 * and undo/redo just snapshots the list.
 *
 * Tools:
 *   grab    — click to select a shape; drag to move; Delete/Backspace removes
 *   rect    — rounded rectangle
 *   circle  — ellipse
 *   arrow   — solid-head arrow
 *   text    — composable signals via `pendingText`; component shows an
 *             HTML input overlay; calls `commitText(value)` on submit
 *   blur    — drag a region; pixelates that area of the original screenshot
 *             (samples from the underlying image so it's idempotent)
 *
 * Ported from devprobe-report (pen tool dropped — not in the pinlay mockup).
 */
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { Ref } from "vue";
import type { DrawTool, Shape, TextShape, BlurShape } from "./types";

const DPR = window.devicePixelRatio || 1;
const BASE_LW = 3 * DPR;
const HIT_THRESH = 12 * DPR;
const TEXT_FONT = Math.round(20 * DPR);

// Selection-box stroke. Hardcoded primary hex because canvas drawing can't
// resolve CSS vars at paint time. Matches `--primary` (light) in tokens.css.
const SELECTION_STROKE = "#7c3aed";
const BLUR_PREVIEW_FILL = "rgba(124,58,237,0.18)";

interface Options {
  canvas: Ref<HTMLCanvasElement | null>;
  screenshotDataUrl: Ref<string>;
  tool: Ref<DrawTool>;
  color: Ref<string>;
}

export function useMarkupCanvas({
  canvas,
  screenshotDataUrl,
  tool,
  color,
}: Options) {
  // ── Shape list & undo history ────────────────────────────────────────────────
  const shapes = ref<Shape[]>([]);
  const undoHistory = ref<Shape[][]>([]); // each = shapes BEFORE the change
  const redoHistory = ref<Shape[][]>([]);

  const selectedIdx = ref<number | null>(null);
  const hoveredIdx = ref<number | null>(null);
  const hasSelection = computed(() => selectedIdx.value !== null);
  const isGrabbing = ref(false);

  /** Set when text-tool clicks; component shows an input overlay there. */
  const pendingText = ref<{ canvasX: number; canvasY: number } | null>(null);

  const bitmapW = ref(0);
  const bitmapH = ref(0);

  let screenshotImg: HTMLImageElement | null = null;

  const canUndo = computed(() => undoHistory.value.length > 0);
  const canRedo = computed(() => redoHistory.value.length > 0);

  const cursorForTool = computed((): string => {
    if (tool.value === "grab") {
      if (isGrabbing.value) return "grabbing";
      return hoveredIdx.value !== null || selectedIdx.value !== null
        ? "grab"
        : "default";
    }
    if (tool.value === "text") return "text";
    return "crosshair";
  });

  // `willReadFrequently: true` opts the 2D context into a software-rendered
  // pipeline that's much faster for repeated `getImageData` calls. We snapshot
  // the canvas at the start of every drag (rect/arrow/blur preview), so the
  // default GPU-backed pipeline triggers Chrome's "set willReadFrequently"
  // warning on every interaction. The option only takes effect on the FIRST
  // getContext call for a given canvas — subsequent calls return the same
  // context — so the function below must be the only place we obtain it.
  function ctx() {
    return (
      canvas.value?.getContext("2d", { willReadFrequently: true }) ?? null
    );
  }

  function toCanvasPx(e: MouseEvent): [number, number] {
    const el = canvas.value!;
    const rect = el.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (el.width / rect.width),
      (e.clientY - rect.top) * (el.height / rect.height),
    ];
  }

  // Selection clears whenever tool changes away from grab.
  watch(tool, (t) => {
    if (t !== "grab") {
      selectedIdx.value = null;
      hoveredIdx.value = null;
      redraw();
    }
    if (t !== "text") pendingText.value = null;
  });

  // ── Screenshot loading ────────────────────────────────────────────────────────
  watch(screenshotDataUrl, loadScreenshot, { immediate: true });

  async function loadScreenshot(url: string) {
    if (!url) return;
    const img = new Image();
    img.src = url;
    await img.decode();
    screenshotImg = img;
    initCanvas(img);
  }

  function initCanvas(img: HTMLImageElement) {
    const el = canvas.value;
    if (!el) return;
    el.width = img.naturalWidth;
    el.height = img.naturalHeight;
    bitmapW.value = img.naturalWidth;
    bitmapH.value = img.naturalHeight;
    redraw();
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeydown);
    if (screenshotImg) initCanvas(screenshotImg);
  });
  onUnmounted(() => window.removeEventListener("keydown", onKeydown));

  // ── Redraw (full repaint from shape list) ─────────────────────────────────────
  function redraw() {
    const c = ctx();
    const el = canvas.value;
    if (!c || !el || !screenshotImg) return;
    c.clearRect(0, 0, el.width, el.height);
    c.drawImage(screenshotImg, 0, 0);
    for (const s of shapes.value) drawShape(c, s);
    if (selectedIdx.value !== null) {
      const s = shapes.value[selectedIdx.value];
      if (s) drawSelectionBox(c, s);
    }
  }

  function drawShape(c: CanvasRenderingContext2D, s: Shape) {
    switch (s.type) {
      case "rect":
        drawRect(c, s.x1, s.y1, s.x2, s.y2, s.color, s.lw);
        break;
      case "circle":
        drawCircle(c, s.x1, s.y1, s.x2, s.y2, s.color, s.lw);
        break;
      case "arrow":
        drawArrow(c, s.x1, s.y1, s.x2, s.y2, s.color, s.lw);
        break;
      case "text":
        drawText(c, s);
        break;
      case "blur":
        drawBlur(c, s);
        break;
    }
  }

  function drawRect(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    col: string,
    lw: number,
  ) {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.lineCap = "round";
    c.lineJoin = "round";
    const r = lw * 1.5;
    const x = Math.min(x1, x2),
      y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1),
      h = Math.abs(y2 - y1);
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.stroke();
  }

  function drawCircle(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    col: string,
    lw: number,
  ) {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.lineCap = "round";
    c.beginPath();
    c.ellipse(
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      Math.abs(x2 - x1) / 2,
      Math.abs(y2 - y1) / 2,
      0,
      0,
      Math.PI * 2,
    );
    c.stroke();
  }

  function drawArrow(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    col: string,
    lw: number,
  ) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist < 4) return;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(22 * DPR, lw * 5);
    const headAng = Math.PI / 6;
    const shaftEnd = dist - headLen * 0.8;
    const sx2 = x1 + Math.cos(angle) * shaftEnd;
    const sy2 = y1 + Math.sin(angle) * shaftEnd;

    c.strokeStyle = col;
    c.lineWidth = lw;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(sx2, sy2);
    c.stroke();

    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(
      x2 - headLen * Math.cos(angle - headAng),
      y2 - headLen * Math.sin(angle - headAng),
    );
    c.lineTo(
      x2 - headLen * Math.cos(angle + headAng),
      y2 - headLen * Math.sin(angle + headAng),
    );
    c.closePath();
    c.fill();
  }

  function drawText(c: CanvasRenderingContext2D, s: TextShape) {
    c.fillStyle = s.color;
    c.font = `600 ${s.fontSize}px Geist, system-ui, sans-serif`;
    c.textBaseline = "top";
    const lines = s.text.split("\n");
    const lh = s.fontSize * 1.25;
    for (let i = 0; i < lines.length; i++)
      c.fillText(lines[i], s.x, s.y + i * lh);
  }

  /** Pixelate a region of the *original* screenshot (idempotent across redraws). */
  function drawBlur(c: CanvasRenderingContext2D, s: BlurShape) {
    if (!screenshotImg || s.w < 2 || s.h < 2) return;
    const PIXEL = 14 * DPR;
    const tw = Math.max(1, Math.ceil(s.w / PIXEL));
    const th = Math.max(1, Math.ceil(s.h / PIXEL));
    const tmp = document.createElement("canvas");
    tmp.width = tw;
    tmp.height = th;
    const tc = tmp.getContext("2d")!;
    tc.imageSmoothingEnabled = true;
    tc.drawImage(screenshotImg, s.x, s.y, s.w, s.h, 0, 0, tw, th);
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(tmp, 0, 0, tw, th, s.x, s.y, s.w, s.h);
    c.restore();
  }

  function drawSelectionBox(c: CanvasRenderingContext2D, s: Shape) {
    const b = getBounds(c, s);
    const pad = 8 * DPR;
    c.save();
    c.strokeStyle = SELECTION_STROKE;
    c.lineWidth = 1.5 * DPR;
    c.setLineDash([6 * DPR, 4 * DPR]);
    c.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
    c.restore();
  }

  // ── Bounds & hit testing ────────────────────────────────────────────────────
  function getBounds(c: CanvasRenderingContext2D, s: Shape) {
    switch (s.type) {
      case "rect":
      case "circle":
      case "arrow": {
        const x = Math.min(s.x1, s.x2),
          y = Math.min(s.y1, s.y2);
        return { x, y, w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
      }
      case "text": {
        c.font = `600 ${s.fontSize}px Geist, system-ui, sans-serif`;
        const lines = s.text.split("\n");
        const w = Math.max(...lines.map((l) => c.measureText(l).width));
        const h = lines.length * s.fontSize * 1.25;
        return { x: s.x, y: s.y, w, h };
      }
      case "blur":
        return { x: s.x, y: s.y, w: s.w, h: s.h };
    }
  }

  function hitTest(x: number, y: number): number | null {
    const c = ctx();
    if (!c) return null;
    for (let i = shapes.value.length - 1; i >= 0; i--) {
      if (hitTestShape(c, shapes.value[i], x, y)) return i;
    }
    return null;
  }

  function hitTestShape(
    c: CanvasRenderingContext2D,
    s: Shape,
    x: number,
    y: number,
  ): boolean {
    switch (s.type) {
      case "rect": {
        const bx = Math.min(s.x1, s.x2),
          bX = Math.max(s.x1, s.x2);
        const by = Math.min(s.y1, s.y2),
          bY = Math.max(s.y1, s.y2);
        const onTop =
          y >= by - HIT_THRESH &&
          y <= by + HIT_THRESH &&
          x >= bx - HIT_THRESH &&
          x <= bX + HIT_THRESH;
        const onBot =
          y >= bY - HIT_THRESH &&
          y <= bY + HIT_THRESH &&
          x >= bx - HIT_THRESH &&
          x <= bX + HIT_THRESH;
        const onLeft =
          x >= bx - HIT_THRESH &&
          x <= bx + HIT_THRESH &&
          y >= by - HIT_THRESH &&
          y <= bY + HIT_THRESH;
        const onRight =
          x >= bX - HIT_THRESH &&
          x <= bX + HIT_THRESH &&
          y >= by - HIT_THRESH &&
          y <= bY + HIT_THRESH;
        return onTop || onBot || onLeft || onRight;
      }
      case "circle": {
        const cx = (s.x1 + s.x2) / 2,
          cy = (s.y1 + s.y2) / 2;
        const rx = Math.abs(s.x2 - s.x1) / 2,
          ry = Math.abs(s.y2 - s.y1) / 2;
        if (rx < 1 || ry < 1) return false;
        const nx = (x - cx) / rx,
          ny = (y - cy) / ry;
        const d = Math.sqrt(nx * nx + ny * ny);
        return Math.abs(d - 1) * Math.min(rx, ry) < HIT_THRESH;
      }
      case "arrow":
        return distToSegment(x, y, s.x1, s.y1, s.x2, s.y2) < HIT_THRESH;
      case "text":
      case "blur": {
        const b = getBounds(c, s);
        return (
          x >= b.x - HIT_THRESH &&
          x <= b.x + b.w + HIT_THRESH &&
          y >= b.y - HIT_THRESH &&
          y <= b.y + b.h + HIT_THRESH
        );
      }
    }
  }

  function distToSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ) {
    const dx = bx - ax,
      dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(
      0,
      Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2),
    );
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // ── Undo / Redo / Delete ────────────────────────────────────────────────────
  function pushUndo(prev: Shape[]) {
    undoHistory.value = [...undoHistory.value.slice(-29), prev];
    redoHistory.value = [];
  }

  function undo() {
    if (!undoHistory.value.length) return;
    const hist = [...undoHistory.value];
    const prev = hist.pop()!;
    undoHistory.value = hist;
    redoHistory.value = [...redoHistory.value, [...shapes.value]];
    shapes.value = prev;
    selectedIdx.value = null;
    redraw();
  }

  function redo() {
    if (!redoHistory.value.length) return;
    const hist = [...redoHistory.value];
    const next = hist.pop()!;
    redoHistory.value = hist;
    undoHistory.value = [...undoHistory.value, [...shapes.value]];
    shapes.value = next;
    selectedIdx.value = null;
    redraw();
  }

  function deleteSelected() {
    if (selectedIdx.value === null) return;
    pushUndo([...shapes.value]);
    shapes.value = shapes.value.filter((_, i) => i !== selectedIdx.value);
    selectedIdx.value = null;
    redraw();
  }

  // ── Drag state ──────────────────────────────────────────────────────────────
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let lastCX = 0;
  let lastCY = 0;
  let previewSnap: ImageData | null = null;
  let shapesAtDrawStart: Shape[] = [];

  // Grab-tool drag (move a selected shape)
  let grabStartShape: Shape | null = null;
  let grabStartShapesArr: Shape[] = [];

  function translateShape(s: Shape, dx: number, dy: number): Shape {
    switch (s.type) {
      case "rect":
      case "circle":
      case "arrow":
        return {
          ...s,
          x1: s.x1 + dx,
          y1: s.y1 + dy,
          x2: s.x2 + dx,
          y2: s.y2 + dy,
        };
      case "text":
      case "blur":
        return { ...s, x: s.x + dx, y: s.y + dy };
    }
  }

  // ── Text tool ───────────────────────────────────────────────────────────────
  function commitText(text: string) {
    const pos = pendingText.value;
    pendingText.value = null;
    if (!pos) return;
    const t = text.trim();
    if (!t) return;
    pushUndo([...shapes.value]);
    shapes.value = [
      ...shapes.value,
      {
        type: "text",
        x: pos.canvasX,
        y: pos.canvasY,
        text: t,
        color: color.value,
        fontSize: TEXT_FONT,
      },
    ];
    redraw();
  }

  function cancelText() {
    pendingText.value = null;
  }

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  function onMousedown(e: MouseEvent) {
    if (e.button !== 0) return;
    const [cx, cy] = toCanvasPx(e);
    lastCX = cx;
    lastCY = cy;

    if (tool.value === "grab") {
      const idx = hitTest(cx, cy);
      selectedIdx.value = idx;
      if (idx !== null) {
        isGrabbing.value = true;
        startX = cx;
        startY = cy;
        grabStartShape = shapes.value[idx];
        grabStartShapesArr = [...shapes.value];
      }
      redraw();
      return;
    }

    if (tool.value === "text") {
      pendingText.value = { canvasX: cx, canvasY: cy };
      return;
    }

    dragging = true;
    startX = cx;
    startY = cy;
    shapesAtDrawStart = [...shapes.value];
    previewSnap =
      ctx()?.getImageData(0, 0, canvas.value!.width, canvas.value!.height) ??
      null;
  }

  function onMousemove(e: MouseEvent) {
    const [cx, cy] = toCanvasPx(e);
    lastCX = cx;
    lastCY = cy;

    if (tool.value === "grab") {
      if (isGrabbing.value && grabStartShape && selectedIdx.value !== null) {
        const dx = cx - startX;
        const dy = cy - startY;
        const moved = translateShape(grabStartShape, dx, dy);
        const next = [...shapes.value];
        next[selectedIdx.value] = moved;
        shapes.value = next;
        redraw();
      } else {
        const idx = hitTest(cx, cy);
        if (idx !== hoveredIdx.value) hoveredIdx.value = idx;
      }
      return;
    }

    if (!dragging || !previewSnap) return;
    const c = ctx();
    if (!c) return;

    c.putImageData(previewSnap, 0, 0);

    switch (tool.value) {
      case "rect":
        drawRect(c, startX, startY, cx, cy, color.value, BASE_LW);
        break;
      case "circle":
        drawCircle(c, startX, startY, cx, cy, color.value, BASE_LW);
        break;
      case "arrow":
        drawArrow(c, startX, startY, cx, cy, color.value, BASE_LW);
        break;
      case "blur":
        previewBlurRect(c, startX, startY, cx, cy);
        break;
    }
  }

  function previewBlurRect(
    c: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) {
    const x = Math.min(x1, x2),
      y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1),
      h = Math.abs(y2 - y1);
    c.save();
    c.fillStyle = BLUR_PREVIEW_FILL;
    c.fillRect(x, y, w, h);
    c.strokeStyle = SELECTION_STROKE;
    c.lineWidth = 1.5 * DPR;
    c.setLineDash([6 * DPR, 4 * DPR]);
    c.strokeRect(x, y, w, h);
    c.restore();
  }

  function onMouseup() {
    if (isGrabbing.value) {
      isGrabbing.value = false;
      if (grabStartShape && selectedIdx.value !== null) {
        const cur = shapes.value[selectedIdx.value];
        if (cur !== grabStartShape) {
          pushUndo(grabStartShapesArr);
        }
      }
      grabStartShape = null;
      grabStartShapesArr = [];
      redraw();
      return;
    }

    if (!dragging) return;
    dragging = false;

    let newShape: Shape | null = null;
    switch (tool.value) {
      case "rect":
        if (Math.abs(lastCX - startX) > 2 && Math.abs(lastCY - startY) > 2)
          newShape = {
            type: "rect",
            x1: startX,
            y1: startY,
            x2: lastCX,
            y2: lastCY,
            color: color.value,
            lw: BASE_LW,
          };
        break;
      case "circle":
        if (Math.abs(lastCX - startX) > 2 && Math.abs(lastCY - startY) > 2)
          newShape = {
            type: "circle",
            x1: startX,
            y1: startY,
            x2: lastCX,
            y2: lastCY,
            color: color.value,
            lw: BASE_LW,
          };
        break;
      case "arrow":
        if (Math.hypot(lastCX - startX, lastCY - startY) > 4)
          newShape = {
            type: "arrow",
            x1: startX,
            y1: startY,
            x2: lastCX,
            y2: lastCY,
            color: color.value,
            lw: BASE_LW,
          };
        break;
      case "blur": {
        const x = Math.min(startX, lastCX),
          y = Math.min(startY, lastCY);
        const w = Math.abs(lastCX - startX),
          h = Math.abs(lastCY - startY);
        if (w > 4 && h > 4) newShape = { type: "blur", x, y, w, h };
        break;
      }
    }

    if (newShape) {
      pushUndo(shapesAtDrawStart);
      shapes.value = [...shapesAtDrawStart, newShape];
      redraw();
    } else if (previewSnap) {
      ctx()?.putImageData(previewSnap, 0, 0);
    }

    previewSnap = null;
    shapesAtDrawStart = [];
  }

  function onMouseleave() {
    hoveredIdx.value = null;
    if (dragging) onMouseup();
  }

  // ── Keyboard ────────────────────────────────────────────────────────────────
  function onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const inField =
      tag === "input" || tag === "textarea" || target?.isContentEditable;

    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    if (inField) return;

    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selectedIdx.value !== null
    ) {
      e.preventDefault();
      deleteSelected();
    }
    if (e.key === "Escape" && selectedIdx.value !== null) {
      selectedIdx.value = null;
      redraw();
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  function exportPng(fallback: string): string {
    // Hide the selection overlay during export
    const sel = selectedIdx.value;
    if (sel !== null) {
      selectedIdx.value = null;
      redraw();
    }
    const url = canvas.value?.toDataURL("image/png") ?? fallback;
    if (sel !== null) {
      selectedIdx.value = sel;
      redraw();
    }
    return url;
  }

  return {
    bitmapW,
    bitmapH,
    canUndo,
    canRedo,
    hasSelection,
    cursorForTool,
    pendingText,
    onMousedown,
    onMousemove,
    onMouseup,
    onMouseleave,
    commitText,
    cancelText,
    deleteSelected,
    exportPng,
    undo,
    redo,
  };
}
