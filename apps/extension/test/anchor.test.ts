/**
 * Anchor-resilience harness (Roadmap 1.2).
 *
 * Pins an element on a fixture page, applies a refactor-style DOM mutation,
 * then asks `resolveAnchor` to re-find it — and checks it found the *right*
 * node. Produces a resolve-rate number per mutation so "pins survive a deploy"
 * is a measurement, not a claim.
 *
 * Coverage: refactor-style mutations + a realistic combined "full deploy" + a
 * subtree move (acceptance #1: >80% of surviving pins resolve green/yellow),
 * plus a destroyed-element case (acceptance #2: resolve → null → the caller
 * falls back to the stored doc coords and flags the pin `stale`).
 *
 * Fidelity note: jsdom has no layout (`getBoundingClientRect` → 0) and no
 * XPath (`document.evaluate` throws → the xpath tier no-ops here). So this is a
 * *conservative lower bound*: the rect tie-breaker and the xpath tier are
 * under-exercised. They're redundant last resorts (the structural tiers
 * preempt them), so the number holds — but a real browser scores ≥ this.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  anchorHealth,
  describeAnchor,
  resolveAnchor,
  suggestReanchor,
  type AnchorConfidence,
} from "../src/lib/anchor";

/** A realistic-ish checkout fragment. The target is the submit button — note
 *  it carries NO test id, so we exercise the selector + fingerprint tiers
 *  rather than the trivial stable-attr path. `data-truth` is the oracle: it is
 *  not in STABLE_ATTRS or FINGERPRINT_ATTRS, so the resolver never sees it. */
const FIXTURE = `
  <main>
    <header><h1 class="title">Checkout</h1></header>
    <section class="panel" role="region">
      <form>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" />
        <div class="row">
          <button class="btn ghost" type="button">Cancel</button>
          <button class="btn primary" type="submit" data-truth="target">Pay now</button>
        </div>
      </form>
    </section>
  </main>
`;

function mount(): void {
  document.body.innerHTML = FIXTURE;
}
afterEach(() => {
  document.body.innerHTML = "";
});

function target(): Element {
  const el = document.querySelector('[data-truth="target"]');
  if (!el) throw new Error("fixture target missing");
  return el;
}

/** Pin the current target, then run a mutation, then resolve. */
function pinThen(mutate: () => void): {
  ok: boolean;
  confidence: AnchorConfidence | null;
} {
  const el = target();
  const anchor = describeAnchor(el, 0, 0);
  mutate();
  const resolved = resolveAnchor(anchor);
  const ok = !!resolved && resolved.el.getAttribute("data-truth") === "target";
  return { ok, confidence: resolved?.confidence ?? null };
}

interface Scenario {
  name: string;
  mutate: () => void;
  /** Marked when jsdom can't fairly judge it (needs real layout / XPath). */
  browserOnly?: boolean;
  /** The element is destroyed — resolve MUST give up (null → dead → stale). */
  expectDead?: boolean;
}

const SCENARIOS: Scenario[] = [
  { name: "baseline (no change)", mutate: () => {} },
  {
    name: "rename all classes",
    mutate: () => {
      document
        .querySelectorAll("[class]")
        .forEach((el) => el.setAttribute("class", "x-" + Math.random().toString(36).slice(2)));
    },
  },
  {
    name: "reorder siblings (swap buttons)",
    mutate: () => {
      const row = document.querySelector(".row")!;
      row.insertBefore(row.children[1], row.children[0]);
    },
  },
  {
    name: "wrap parent in a new div",
    mutate: () => {
      const form = document.querySelector("form")!;
      const wrap = document.createElement("div");
      wrap.className = "wrapper";
      form.parentElement!.insertBefore(wrap, form);
      wrap.appendChild(form);
    },
  },
  {
    name: "edit a sibling's copy",
    mutate: () => {
      document.querySelector('button[type="button"]')!.textContent = "Go back";
    },
  },
  {
    name: "remount target (replace with clone)",
    mutate: () => {
      const el = target();
      el.replaceWith(el.cloneNode(true));
    },
  },
  {
    name: "insert a leading sibling section",
    mutate: () => {
      const main = document.querySelector("main")!;
      const extra = document.createElement("section");
      extra.className = "panel";
      extra.innerHTML = "<form><button class='btn' type='submit'>Other</button></form>";
      main.insertBefore(extra, main.firstChild);
    },
  },
  {
    // Two identical submit buttons: only proximity (real layout) can pick the
    // right one. jsdom returns 0-rects so the tie-breaker is blind here.
    name: "ambiguous duplicate (browser-only fidelity)",
    browserOnly: true,
    mutate: () => {
      const row = document.querySelector(".row")!;
      const dupe = document.createElement("button");
      dupe.className = "btn primary";
      dupe.setAttribute("type", "submit");
      dupe.textContent = "Pay now";
      row.appendChild(dupe);
    },
  },
  {
    // The realistic "next deploy" — several refactors at once. This is the
    // case the whole product claim ("pins survive a deploy") rests on.
    name: "full deploy (rename + reorder + wrap + edit copy)",
    mutate: () => {
      const row = document.querySelector(".row")!;
      const form = document.querySelector("form")!;
      document
        .querySelectorAll("[class]")
        .forEach((el) => el.setAttribute("class", "x-" + Math.random().toString(36).slice(2)));
      row.insertBefore(row.children[1], row.children[0]); // swap buttons
      const wrap = document.createElement("div"); // wrap the form
      form.parentElement!.insertBefore(wrap, form);
      wrap.appendChild(form);
      const cancel = row.querySelector('button[type="button"]');
      if (cancel) cancel.textContent = "Go back"; // re-word the sibling
    },
  },
  {
    // The target is hoisted into a brand-new container elsewhere in the tree —
    // its whole structural path changes, so only the fingerprint tiers can win.
    name: "move target into a new toolbar",
    mutate: () => {
      const el = target();
      const toolbar = document.createElement("nav");
      toolbar.className = "toolbar";
      document.querySelector("main")!.appendChild(toolbar);
      toolbar.appendChild(el);
    },
  },
  {
    // Acceptance #2: when the element is genuinely gone, resolve must give up
    // cleanly so the caller (AnnotationOverlay.viewportPos) can fall back to
    // the stored doc coords and flag the pin `stale` — never resolve to a
    // wrong node.
    name: "target removed entirely (graceful degradation)",
    expectDead: true,
    mutate: () => {
      target().remove();
    },
  },
];

describe("anchor resolution under DOM mutation", () => {
  const results: {
    name: string;
    ok: boolean;
    tier: string;
    browserOnly: boolean;
    expectDead: boolean;
  }[] = [];

  for (const s of SCENARIOS) {
    it(s.name, () => {
      mount();
      const { ok, confidence } = pinThen(s.mutate);
      results.push({
        name: s.name,
        ok,
        tier: confidence ?? "dead",
        browserOnly: !!s.browserOnly,
        expectDead: !!s.expectDead,
      });
      if (s.expectDead) {
        // Must give up cleanly — never resolve a destroyed element to a
        // wrong node. The caller then renders at stored coords + stale.
        expect(confidence).toBeNull();
        expect(anchorHealth(confidence)).toBe("dead");
      } else if (!s.browserOnly) {
        // Every other scenario must re-find the EXACT element.
        expect(ok).toBe(true);
      }
    });
  }

  it("prints a resolve-rate report", () => {
    // "Judged" = scenarios where the element still exists and jsdom can fairly
    // grade the result. Dead + browser-only cases are reported but excluded.
    const judged = results.filter((r) => !r.browserOnly && !r.expectDead);
    const passed = judged.filter((r) => r.ok).length;
    const rate = judged.length ? Math.round((passed / judged.length) * 100) : 0;

    const band = (r: (typeof results)[number]) =>
      anchorHealth(r.tier === "dead" ? null : (r.tier as AnchorConfidence));
    const green = judged.filter((r) => r.ok && band(r) === "ok").length;
    const yellow = judged.filter((r) => r.ok && band(r) === "fallback").length;
    const deadHandled = results.filter((r) => r.expectDead && !r.ok).length;
    const deadTotal = results.filter((r) => r.expectDead).length;

    const tag = (r: (typeof results)[number]) =>
      r.browserOnly ? "  [browser-only]" : r.expectDead ? "  [dead→stale]" : "";

    const lines = [
      "",
      "── Anchor resilience — resolve rate ─────────────────────────",
      ...results.map(
        (r) =>
          `  ${r.ok ? "✓" : r.expectDead ? "○" : "✗"}  ${r.name.padEnd(46)} → ${r.tier} (${band(r)})${tag(r)}`,
      ),
      "  ───────────────────────────────────────────────────────────",
      `  ${passed}/${judged.length} surviving scenarios resolved correctly = ${rate}%`,
      `  bands: 🟢 ${green} green (structural) · 🟡 ${yellow} yellow (heuristic)`,
      `  graceful degradation: ${deadHandled}/${deadTotal} dead anchors fell back to stale`,
      "  (xpath tier + rect tie-break are browser-only; this is a lower bound)",
      "─────────────────────────────────────────────────────────────",
      "",
    ];
    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));
    // Roadmap 1.2 acceptance: >80% of surviving pins resolve green/yellow.
    expect(rate).toBeGreaterThanOrEqual(80);
    // And every dead anchor must degrade gracefully (none resolve wrong).
    expect(deadHandled).toBe(deadTotal);
  });

  it("anchorHealth maps tiers to coarse bands", () => {
    expect(anchorHealth("stable-attr")).toBe("ok");
    expect(anchorHealth("selector")).toBe("ok");
    expect(anchorHealth("xpath")).toBe("ok");
    expect(anchorHealth("attribute")).toBe("fallback");
    expect(anchorHealth("text")).toBe("fallback");
    expect(anchorHealth("role")).toBe("fallback");
    expect(anchorHealth(null)).toBe("dead");
  });
});

// ── Roadmap 1.3: suggested re-anchor (fuzzy) ─────────────────────────────────
describe("suggested re-anchor", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("proposes a moved + reworded element that exact resolution can't find", () => {
    document.body.innerHTML = `
      <main>
        <section role="region">
          <form>
            <div class="row">
              <button type="submit" title="Pay now">Pay now</button>
            </div>
          </form>
        </section>
      </main>
    `;
    const anchor = describeAnchor(
      document.querySelector('button[type="submit"]')!,
      0,
      0,
    );

    // A deploy: the original node is gone. A reworded button (kept its title,
    // changed type + copy) now lives in a brand-new toolbar — so every
    // structural locator AND every exact fingerprint misses — plus a decoy.
    document.body.innerHTML = `
      <main>
        <nav class="toolbar">
          <button type="button" title="Pay now" data-truth="moved">Pay now please</button>
        </nav>
        <footer>
          <button type="reset" title="Log out">Log out</button>
        </footer>
      </main>
    `;
    expect(resolveAnchor(anchor)).toBeNull(); // exact/structural tiers give up
    const suggestion = suggestReanchor(anchor);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.el.getAttribute("data-truth")).toBe("moved");
    expect(suggestion!.confidence).toBeGreaterThan(0.4);
    expect(suggestion!.confidence).toBeLessThanOrEqual(1);
  });

  it("returns null when nothing on the page is similar enough", () => {
    document.body.innerHTML = `<main><button type="submit" title="Pay now">Pay now</button></main>`;
    const anchor = describeAnchor(document.querySelector("button")!, 0, 0);
    // Dissimilar button, nested so the stored selector ("main > button") can't
    // even weakly match it — i.e. the pin is genuinely dead.
    document.body.innerHTML = `<main><aside><nav><button type="reset" title="Log out">Log out</button></nav></aside></main>`;
    expect(resolveAnchor(anchor)).toBeNull();
    expect(suggestReanchor(anchor)).toBeNull();
  });
});
