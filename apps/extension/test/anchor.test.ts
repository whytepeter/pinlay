/**
 * Anchor-resilience harness (Roadmap 1.2).
 *
 * Pins an element on a fixture page, applies a refactor-style DOM mutation,
 * then asks `resolveAnchor` to re-find it — and checks it found the *right*
 * node. Produces a resolve-rate number per mutation so "pins survive a deploy"
 * is a measurement, not a claim.
 *
 * Fidelity note: jsdom has no layout (`getBoundingClientRect` → 0) and no
 * XPath (`document.evaluate` throws → the xpath tier no-ops here). So this is a
 * *conservative lower bound*: the rect tie-breaker and the xpath tier are
 * under-exercised. A real browser would score the ambiguous case higher.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  anchorHealth,
  describeAnchor,
  resolveAnchor,
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
];

describe("anchor resolution under DOM mutation", () => {
  const results: { name: string; ok: boolean; tier: string; browserOnly: boolean }[] = [];

  for (const s of SCENARIOS) {
    it(s.name, () => {
      mount();
      const { ok, confidence } = pinThen(s.mutate);
      results.push({
        name: s.name,
        ok,
        tier: confidence ?? "dead",
        browserOnly: !!s.browserOnly,
      });
      // Non-browser-only scenarios must re-find the exact element.
      if (!s.browserOnly) expect(ok).toBe(true);
    });
  }

  it("prints a resolve-rate report", () => {
    const judged = results.filter((r) => !r.browserOnly);
    const passed = judged.filter((r) => r.ok).length;
    const rate = judged.length ? Math.round((passed / judged.length) * 100) : 0;

    const lines = [
      "",
      "── Anchor resilience — resolve rate ─────────────────────────",
      ...results.map(
        (r) =>
          `  ${r.ok ? "✓" : "✗"}  ${r.name.padEnd(42)} → ${r.tier} (${anchorHealth(
            r.tier === "dead" ? null : (r.tier as AnchorConfidence),
          )})${r.browserOnly ? "  [browser-only]" : ""}`,
      ),
      "  ───────────────────────────────────────────────────────────",
      `  ${passed}/${judged.length} jsdom-judgeable scenarios resolved correctly = ${rate}%`,
      "  (xpath tier + rect tie-break are browser-only; this is a lower bound)",
      "─────────────────────────────────────────────────────────────",
      "",
    ];
    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));
    expect(rate).toBeGreaterThanOrEqual(80);
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
