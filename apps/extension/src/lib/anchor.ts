/**
 * Element anchoring for live annotation.
 *
 * Describes a DOM element well enough that the same node can be located
 * later — after re-renders, scroll, layout shifts, even minor DOM edits.
 *
 * v1 strategy:
 *   1. Stable test/semantic attributes  (data-testid, id, aria-label, role)
 *   2. CSS selector path                 (cap at 4-6 levels, prune to stable
 *                                          ancestor when found)
 *   3. Bounding rect + click offset      (viewport-relative fallback)
 *
 * Parked (the shape leaves room): XPath, accessible-name lookup, text
 * fingerprint, ancestor fingerprint, SDK component hints.
 */

const STABLE_ATTRS = [
  "data-testid",
  "data-test",
  "data-cy",
  "id",
  "aria-label",
  "name",
] as const;

export interface PinAnchor {
  /** CSS selector path (the most portable single-string locator we have). */
  selector: string;
  /** Tag name in lower case. */
  tag: string;
  /** Most stable attribute we found — usually data-testid or id. Null if none. */
  stableAttr: { name: string; value: string } | null;
  /** Optional aria-role for re-resolution fallback. */
  role: string | null;
  /** Element's bounding rect at capture time (viewport-relative). */
  rect: { x: number; y: number; w: number; h: number };
  /** Click offset within the element, as percentages 0..1. */
  offset: { xPct: number; yPct: number };
  /** Viewport + DPR snapshot — lets us compare scales on resolve. */
  viewport: { width: number; height: number; dpr: number };
  /** Scroll position at the moment of pinning (page-relative). */
  scroll: { x: number; y: number };
  /** Page route + query at capture time. */
  url: { pathname: string; search: string; hash: string };
}

function cssQuote(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function describeSegment(el: Element): string {
  for (const attr of STABLE_ATTRS) {
    const v = el.getAttribute(attr);
    if (v && v.length > 0 && v.length < 100) {
      // Skip auto-generated numeric ids common in MUI / Headless UI.
      if (attr === "id" && /^[\d-]+$/.test(v)) continue;
      return `${el.tagName.toLowerCase()}[${attr}=${cssQuote(v)}]`;
    }
  }
  // Fallback: tag + nth-of-type (unambiguous up to its parent).
  const parent = el.parentElement;
  if (!parent) return el.tagName.toLowerCase();
  const sameTag = Array.from(parent.children).filter(
    (c) => c.tagName === el.tagName,
  );
  if (sameTag.length === 1) return el.tagName.toLowerCase();
  const idx = sameTag.indexOf(el) + 1;
  return `${el.tagName.toLowerCase()}:nth-of-type(${idx})`;
}

function describeSelector(target: Element): string {
  const segments: string[] = [];
  let el: Element | null = target;
  let depth = 0;
  while (el && el.nodeType === 1 && depth < 6) {
    const seg = describeSegment(el);
    segments.unshift(seg);
    // Stop when we hit a stable attribute — the path is unique from here.
    if (/\[(data-testid|data-test|data-cy|id|aria-label|name)=/.test(seg)) break;
    el = el.parentElement;
    depth++;
  }
  return segments.join(" > ");
}

function findStableAttr(el: Element): PinAnchor["stableAttr"] {
  for (const name of STABLE_ATTRS) {
    const value = el.getAttribute(name);
    if (value && value.length < 100) {
      if (name === "id" && /^[\d-]+$/.test(value)) continue;
      return { name, value };
    }
  }
  return null;
}

/**
 * Build a PinAnchor describing the click on `el` at viewport coordinates
 * `(clientX, clientY)`. Captured synchronously so the snapshot is consistent
 * even if the page re-renders the next tick.
 */
export function describeAnchor(
  el: Element,
  clientX: number,
  clientY: number,
): PinAnchor {
  const rect = el.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  return {
    selector: describeSelector(el),
    tag: el.tagName.toLowerCase(),
    stableAttr: findStableAttr(el),
    role: el.getAttribute("role"),
    rect: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
    },
    offset: {
      xPct: rect.width > 0 ? Math.max(0, Math.min(1, offsetX / rect.width)) : 0.5,
      yPct:
        rect.height > 0 ? Math.max(0, Math.min(1, offsetY / rect.height)) : 0.5,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    },
    scroll: { x: window.scrollX, y: window.scrollY },
    url: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
  };
}

/**
 * Try to relocate the element described by `anchor` in the current DOM.
 *
 * Resolution order:
 *   1. Stable attribute → unique match if present
 *   2. CSS selector path
 *   3. (caller falls back to viewport rect placement)
 */
export function resolveAnchor(
  anchor: PinAnchor,
): { el: Element; confidence: "stable-attr" | "selector" } | null {
  if (anchor.stableAttr) {
    const { name, value } = anchor.stableAttr;
    const match = document.querySelector(
      `${anchor.tag}[${name}=${cssQuote(value)}]`,
    );
    if (match) return { el: match, confidence: "stable-attr" };
  }
  try {
    const match = document.querySelector(anchor.selector);
    if (match) return { el: match, confidence: "selector" };
  } catch {
    /* invalid selector — fall through */
  }
  return null;
}
