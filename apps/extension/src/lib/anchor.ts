/**
 * Element anchoring for live annotation.
 *
 * Describes a DOM element well enough that the same node can be located
 * later — after re-renders, scroll, layout shifts, even a refactor that
 * renames classes or reorders siblings.
 *
 * Resolution is graded — we try the most reliable locator first and degrade:
 *   1. Stable test/semantic attribute   (data-testid, id, aria-label, …)  → "stable-attr"
 *   2. CSS selector path                 (cap 6 levels, pruned to a stable
 *                                          ancestor when found)             → "selector"
 *   3. XPath                             (independent structural attempt)  → "xpath"
 *   4. Attribute fingerprint             (semantic attrs, position-free)   → "attribute"
 *   5. Text + ancestor fingerprint       (the element's words + its frame) → "text"
 *   6. Role + accessible name                                              → "role"
 *   7. (caller falls back to the stored bounding rect → pin is "stale")
 *
 * Tiers 1–3 are *structural* (green). Tiers 4–6 are *heuristic* (yellow):
 * they re-find an element that moved or was re-rendered, by what it IS rather
 * than where it sits. See {@link anchorHealth}.
 */

const STABLE_ATTRS = [
  "data-testid",
  "data-test",
  "data-cy",
  "id",
  "aria-label",
  "name",
] as const;

/** Attributes that tend to survive refactors — the attribute fingerprint. */
const FINGERPRINT_ATTRS = [
  "type",
  "name",
  "placeholder",
  "alt",
  "title",
  "role",
  "aria-label",
  "href",
  "for",
  "value",
] as const;

const MAX_TEXT_FINGERPRINT = 80;
/** Cap how many same-tag elements we scan in the heuristic tiers (perf guard). */
const MAX_CANDIDATES = 500;

export type AnchorConfidence =
  | "stable-attr"
  | "selector"
  | "xpath"
  | "attribute"
  | "text"
  | "role";

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

  // ── Resilience tiers (optional: absent on legacy pins, which still resolve
  //    via the structural locators above) ───────────────────────────────────
  /** Best-effort descendant XPath. */
  xpath?: string;
  /** aria-label / labelledby / alt / title / placeholder / short text. */
  accessibleName?: string | null;
  /** Normalised, lower-cased, length-capped text content. */
  textFingerprint?: string;
  /** `tag|attr=value|…` of stable semantic attributes (position-free). */
  attributeFingerprint?: string;
  /** Tags (+roles) of up to 3 ancestors, e.g. `form>div[group]>section`. */
  ancestorFingerprint?: string;
}

function cssQuote(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Defensive: never match pinlay's own shadow-host custom elements. */
function isPinlayChrome(el: Element): boolean {
  return el.tagName.startsWith("PINLAY-");
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

/** Best-effort descendant XPath (capped depth → matchable with a `//` prefix). */
function describeXpath(target: Element): string {
  const segs: string[] = [];
  let el: Element | null = target;
  let depth = 0;
  while (el && el.nodeType === 1 && depth < 8) {
    const tag = el.tagName.toLowerCase();
    const parent: Element | null = el.parentElement;
    const sameTag = parent
      ? Array.from(parent.children).filter((c) => c.tagName === el!.tagName)
      : [el];
    const idx = sameTag.length > 1 ? `[${sameTag.indexOf(el) + 1}]` : "";
    segs.unshift(`${tag}${idx}`);
    if (!parent) break;
    el = parent;
    depth++;
  }
  return "//" + segs.join("/");
}

function describeAccessibleName(el: Element): string | null {
  const aria = el.getAttribute("aria-label");
  if (aria) return normalizeText(aria);
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const ref = document.getElementById(labelledby);
    if (ref) return normalizeText(ref.textContent) || null;
  }
  for (const attr of ["alt", "title", "placeholder"]) {
    const v = el.getAttribute(attr);
    if (v) return normalizeText(v);
  }
  const text = normalizeText(el.textContent);
  return text && text.length <= 80 ? text : null;
}

function describeTextFingerprint(el: Element): string {
  return normalizeText(el.textContent).slice(0, MAX_TEXT_FINGERPRINT).toLowerCase();
}

function describeAttributeFingerprint(el: Element): string {
  const parts: string[] = [el.tagName.toLowerCase()];
  for (const name of FINGERPRINT_ATTRS) {
    const v = el.getAttribute(name);
    if (v != null && v.length > 0 && v.length < 120) {
      let val = v;
      if (name === "href") {
        try {
          val = new URL(v, location.href).pathname;
        } catch {
          /* keep raw */
        }
      }
      parts.push(`${name}=${normalizeText(val)}`);
    }
  }
  return parts.join("|");
}

function describeAncestorFingerprint(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el.parentElement;
  let depth = 0;
  while (cur && cur.nodeType === 1 && depth < 3) {
    const role = cur.getAttribute("role");
    parts.push(
      role ? `${cur.tagName.toLowerCase()}[${role}]` : cur.tagName.toLowerCase(),
    );
    cur = cur.parentElement;
    depth++;
  }
  return parts.join(">");
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
  const attributeFingerprint = describeAttributeFingerprint(el);
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
    xpath: describeXpath(el),
    accessibleName: describeAccessibleName(el),
    textFingerprint: describeTextFingerprint(el),
    // Only keep the attribute fingerprint if it carries a real attribute
    // (a bare tag like "button" would match everything — useless).
    attributeFingerprint: attributeFingerprint.includes("|")
      ? attributeFingerprint
      : undefined,
    ancestorFingerprint: describeAncestorFingerprint(el),
  };
}

/** Center of the captured rect, for tie-breaking among equal candidates. */
function rectCenter(anchor: PinAnchor): { x: number; y: number } {
  return { x: anchor.rect.x + anchor.rect.w / 2, y: anchor.rect.y + anchor.rect.h / 2 };
}

/** Among candidates, prefer an ancestor-fingerprint match, then the closest. */
function disambiguate(candidates: Element[], anchor: PinAnchor): Element | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  let pool = candidates;
  if (anchor.ancestorFingerprint) {
    const byAncestor = pool.filter(
      (el) => describeAncestorFingerprint(el) === anchor.ancestorFingerprint,
    );
    if (byAncestor.length === 1) return byAncestor[0];
    if (byAncestor.length > 1) pool = byAncestor;
  }

  const c = rectCenter(anchor);
  let best: Element | null = null;
  let bestDist = Infinity;
  for (const el of pool) {
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width / 2 - c.x;
    const dy = r.top + r.height / 2 - c.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best;
}

/** Same-tag elements (capped), skipping pinlay's own chrome. */
function tagCandidates(tag: string): Element[] {
  const coll = document.getElementsByTagName(tag);
  const out: Element[] = [];
  for (let i = 0; i < coll.length && out.length < MAX_CANDIDATES; i++) {
    const el = coll[i];
    if (!isPinlayChrome(el)) out.push(el);
  }
  return out;
}

function byXpath(xpath: string): Element | null {
  try {
    const r = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    const node = r.singleNodeValue;
    return node && node.nodeType === 1 && !isPinlayChrome(node as Element)
      ? (node as Element)
      : null;
  } catch {
    return null;
  }
}

/**
 * Does `el` still look like the element we captured? A structural locator
 * (selector / xpath) can resolve to the *wrong* node after a sibling reorder —
 * `button:nth-of-type(2)` happily matches whatever now sits in position 2. We
 * guard against that by confirming the candidate against the stored
 * fingerprints. Returns `true` when there's nothing to check (legacy anchors).
 */
function confirmsStored(el: Element, anchor: PinAnchor): boolean {
  const hasAttr = !!anchor.attributeFingerprint;
  const hasText = !!anchor.textFingerprint && anchor.textFingerprint.length >= 2;
  if (!hasAttr && !hasText) return true;
  if (hasAttr && describeAttributeFingerprint(el) === anchor.attributeFingerprint) {
    return true;
  }
  if (hasText && describeTextFingerprint(el) === anchor.textFingerprint) {
    return true;
  }
  return false;
}

/**
 * Try to relocate the element described by `anchor` in the current DOM.
 *
 * Returns the match plus the {@link AnchorConfidence} tier it resolved at, or
 * `null` when nothing matched (the caller then falls back to the stored rect).
 *
 * Structural tiers (selector / xpath) run first and are cheap, but they are
 * *confirmed* against the stored fingerprint — a structural hit that no longer
 * looks like the captured element is held as a weak fallback while the
 * heuristic fingerprint tiers get a chance to re-find the real one. Only if
 * those also miss do we return the unconfirmed structural match (still better
 * than dropping to raw coordinates).
 */
export function resolveAnchor(
  anchor: PinAnchor,
): { el: Element; confidence: AnchorConfidence } | null {
  // 1. Stable attribute — strongest signal; trusted without confirmation
  //    (a test id is meant to be the identity, even if text/attrs changed).
  if (anchor.stableAttr) {
    const { name, value } = anchor.stableAttr;
    try {
      const match = document.querySelector(
        `${anchor.tag}[${name}=${cssQuote(value)}]`,
      );
      if (match && !isPinlayChrome(match)) {
        return { el: match, confidence: "stable-attr" };
      }
    } catch {
      /* invalid attr selector — fall through */
    }
  }

  // Unconfirmed structural hit, kept in case every heuristic tier misses.
  let weak: { el: Element; confidence: AnchorConfidence } | null = null;

  // 2. CSS selector path (confirmed against fingerprint).
  try {
    const match = document.querySelector(anchor.selector);
    if (match && !isPinlayChrome(match)) {
      if (confirmsStored(match, anchor)) {
        return { el: match, confidence: "selector" };
      }
      weak ??= { el: match, confidence: "selector" };
    }
  } catch {
    /* invalid selector — fall through */
  }

  // 3. XPath — independent structural attempt (confirmed against fingerprint).
  if (anchor.xpath) {
    const match = byXpath(anchor.xpath);
    if (match) {
      if (confirmsStored(match, anchor)) {
        return { el: match, confidence: "xpath" };
      }
      weak ??= { el: match, confidence: "xpath" };
    }
  }

  // 4. Attribute fingerprint — re-find by what the element IS, not where.
  if (anchor.attributeFingerprint) {
    const matches = tagCandidates(anchor.tag).filter(
      (el) => describeAttributeFingerprint(el) === anchor.attributeFingerprint,
    );
    const picked = disambiguate(matches, anchor);
    if (picked) return { el: picked, confidence: "attribute" };
  }

  // 5. Text + ancestor fingerprint.
  if (anchor.textFingerprint && anchor.textFingerprint.length >= 2) {
    const matches = tagCandidates(anchor.tag).filter(
      (el) => describeTextFingerprint(el) === anchor.textFingerprint,
    );
    const picked = disambiguate(matches, anchor);
    if (picked) return { el: picked, confidence: "text" };
  }

  // 6. Role + accessible name.
  if (anchor.role && anchor.accessibleName) {
    const matches = Array.from(
      document.querySelectorAll(`[role=${cssQuote(anchor.role)}]`),
    ).filter(
      (el) =>
        !isPinlayChrome(el) &&
        describeAccessibleName(el) === anchor.accessibleName,
    );
    const picked = disambiguate(matches, anchor);
    if (picked) return { el: picked, confidence: "role" };
  }

  // Every heuristic tier missed — fall back to the unconfirmed structural hit
  // (if any). Better an element that moved than raw stored coordinates.
  return weak;
}

/** Coarse health band for the resolve-health badge (Roadmap 1.1). */
export type AnchorHealth = "ok" | "fallback" | "dead";

/**
 * Map a resolve result to a coarse health tier for the dashboard badge:
 *   - `ok`        — found via a structural locator (stable-attr / selector / xpath)
 *   - `fallback`  — found heuristically (attribute / text / role) — likely moved
 *   - `dead`      — not found; the pin renders at its stored coordinates (stale)
 */
export function anchorHealth(
  confidence: AnchorConfidence | null,
): AnchorHealth {
  if (confidence === null) return "dead";
  if (confidence === "stable-attr" || confidence === "selector" || confidence === "xpath") {
    return "ok";
  }
  return "fallback";
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggested re-anchor (Roadmap 1.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum similarity for a "did this pin move here?" suggestion to be shown.
 * Tuned for *recall*: a stale anchor only reaches here once the structural
 * locators are dead AND the exact fingerprints miss, so the survivors are
 * moderate matches by nature. The user always confirms against the live
 * highlight before it's applied, so a lower bar costs nothing.
 */
const MIN_SUGGEST_CONFIDENCE = 0.4;

export interface ReanchorSuggestion {
  el: Element;
  /** 0..1 similarity to the stored anchor hints. */
  confidence: number;
}

function tokenSet(s: string | null | undefined): Set<string> {
  return new Set((s ?? "").split(/\s+/).filter(Boolean));
}

/** Jaccard overlap of two token sets (1 when both empty, 0 when one is empty). */
function setSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** `name=value` parts of an attribute fingerprint (drops the leading tag). */
function fingerprintParts(fp: string | undefined): Set<string> {
  const parts = (fp ?? "").split("|");
  parts.shift();
  return new Set(parts.filter(Boolean));
}

function ancestorParts(s: string | undefined): Set<string> {
  return new Set((s ?? "").split(">").filter(Boolean));
}

/**
 * Fuzzy "did this pin move here?" suggestion for a DEAD anchor.
 *
 * Where {@link resolveAnchor} demands an *exact* fingerprint match, this scores
 * every same-tag candidate by weighted *similarity* across the stored hints
 * (attributes, text, ancestor frame, accessible name) and returns the closest
 * one — so a refactor that reworded a label, swapped a class, or moved the
 * element can still propose the right target with a confidence the UI surfaces
 * as "~NN% match". Only meaningful once `resolveAnchor` returned null; returns
 * null when nothing clears {@link MIN_SUGGEST_CONFIDENCE}.
 */
export function suggestReanchor(anchor: PinAnchor): ReanchorSuggestion | null {
  const want = {
    attrs: fingerprintParts(anchor.attributeFingerprint),
    text: tokenSet(anchor.textFingerprint),
    anc: ancestorParts(anchor.ancestorFingerprint),
    name: tokenSet(anchor.accessibleName),
  };
  const weight = {
    attrs: anchor.attributeFingerprint ? 0.4 : 0,
    text: anchor.textFingerprint && anchor.textFingerprint.length >= 2 ? 0.35 : 0,
    anc: anchor.ancestorFingerprint ? 0.15 : 0,
    name: anchor.accessibleName ? 0.1 : 0,
  };
  const totalWeight = weight.attrs + weight.text + weight.anc + weight.name;
  if (totalWeight === 0) return null; // nothing stored to match against

  let best: ReanchorSuggestion | null = null;
  for (const el of tagCandidates(anchor.tag)) {
    const score =
      weight.attrs *
        setSimilarity(want.attrs, fingerprintParts(describeAttributeFingerprint(el))) +
      weight.text * setSimilarity(want.text, tokenSet(describeTextFingerprint(el))) +
      weight.anc *
        setSimilarity(want.anc, ancestorParts(describeAncestorFingerprint(el))) +
      weight.name * setSimilarity(want.name, tokenSet(describeAccessibleName(el)));
    const confidence = score / totalWeight;
    if (!best || confidence > best.confidence) best = { el, confidence };
  }
  return best && best.confidence >= MIN_SUGGEST_CONFIDENCE ? best : null;
}
