# pinlay — Product Roadmap

> Prioritized plan for the browser extension + dashboard.
> Ordering is by **evidence and leverage**, not by what's most fun to build.
> Personas: **QA** (files the pin), **Dev** (fixes the bug), **Reviewer**
> (PM/designer triaging), **Designer** (review vs. design).
>
> _Rewritten 2026-05-30 to commit to a single wedge and resolve the
> spec/roadmap contradiction (see "Positioning" below)._

---

## Positioning — the one decision everything hangs on

pinlay is **persistent, anchored comments for your live web app** — the pins
stick to real DOM elements, survive deploys, and a developer can walk through
the open ones *on the live page* and resolve them in context.

That sentence is the wedge. It is the one thing the crowded field around us
(Marker.io, BugHerd, Userback, Ruttl, Pastel) does **not** do well, and the one
thing the funded repro-tools (Jam.dev, Bird Eats Bug) don't do at all. Vercel
has persistent comments but only on preview deploys — nobody owns "comments
that stick to staging and production for any site."

**What we are NOT (v1):** a screen recorder, a repro-bundle tool, or a
project-management replacement. The **debug bundle** (console/network/DOM
capture) was the old Phase 1 "biggest leverage point." It is demoted: it is a
**paid expansion** that closes the dev loop *after* the wedge has pulled users
in — not the thing we differentiate on. Building it first means fighting Jam on
the one feature Jam exists to own, while abandoning the moat that's actually
ours.

> This resolves the contradiction between `specs/GENERAL_SPEC.md` §7 (lightweight
> annotation layer, no console/network capture) and the previous roadmap (debug
> bundle as #1). The spec wins for v1. The bundle returns in Phase 5 as Team-tier.

**The three things that make this a product** (everything else is decoration
until these exist):

1. The anchor is unbreakable — pins survive a real refactor/deploy.
2. A dev can see and resolve open pins live on the page (the **developer overlay**).
3. Status round-trips with Linear so pins don't die in a dashboard nobody reopens.

---

## Phase 0 — Validation 🔥🔥🔥  (no code)

> The highest-leverage work this month involves writing zero features. We have a
> polished dashboard and a working annotation flow and **no evidence anyone wants
> this.** Get that evidence before building more.

| # | Item | Status |
|---|---|---|
| 0.1 | Recruit 5 real users (QA / designer / PM at small product teams) | open |
| 0.2 | Watch each one drop pins on *their own* live site, unscripted, screen-shared | open |
| 0.3 | Capture: where they hesitate, what they expected, would-they-pay | open |
| 0.4 | Kill / keep / change decision on the wedge based on what you see | open |

**Acceptance:** You can name 5 people who used it and quote what each said.
If you can't find 5 who'll *try* it, that's the most important signal on this
page — and far cheaper to get now than after Phase 4.

**Leftover Phase-0 UX correctness fixes** (do these only if they block a user
test — otherwise they wait):

| # | Item | Status |
|---|---|---|
| 0.5 | Severity / status / type icon dictionary audit (no missing lucide names) | open |
| 0.6 | Loading + error empty states for `getPagePins` while API is wiring up | open |
| 0.7 | Disable submit during `submitting` (audit pass) | open |

---

## Phase 1 — The Anchor Moat 🔥🔥🔥

> This is the only genuinely hard, genuinely *ours* problem. If the anchor isn't
> rock-solid, we are a worse Marker.io. If it is, we are the only "comments that
> stick to production" tool not locked to Vercel. **Prove a pin survives a real
> deploy before building anything else.** (Pulled forward from the old Phase 4.)

### 1.1 Anchor-health badge

**What:** Every pin shows a resolve-health indicator:
- 🟢 **Resolves** via stable-attr or selector
- 🟡 **Fallback** to bounding rect / text fingerprint only
- 🔴 **Dead** — no resolve target

**Why:** Dev and Reviewer know instantly whether a pin still points at
something. This is also our honesty signal — we're claiming durability, so we
must *show* it.

**Spec:** Health checked when the dashboard pin card mounts (hidden iframe to the
page, fast) or server-side on a refresh-on-demand job. Cache on the pin row.

**Effort:** M (3 days)

### 1.2 Resilient anchor hardening + the "survives a deploy" test

**What:** Tighten the resolve chain (stable-attr → selector → text fingerprint →
bbox) and build a repeatable test harness: pin a page, mutate the DOM the way a
real refactor would (reorder, rename classes, wrap in a div, change copy), and
measure resolve rate.

**Why:** This is the claim the whole product rests on. We need a number.

**Acceptance:**
- [ ] Documented resolve rate across the mutation harness (target: >80% green/yellow)
- [ ] Dead-anchor cases degrade gracefully to stored doc coords with a `stale: true` flag

**Effort:** M (3–4 days)

### 1.3 Suggested re-anchor

**What:** When the stable-attr is gone, diff the page against the stored anchor
hints and surface *"Did this pin move here?"* with a thumbnail + confidence.

**Why:** Refactors don't kill the issue trail. This is the feature that turns
"durable anchor" from a claim into a delight.

**Effort:** M (2–3 days)
**Dependencies:** 1.1, 1.2. (Needs a lightweight DOM hint stored at pin time —
the *minimum* snapshot to support re-anchor, NOT the full debug-bundle DOM capture.)

---

## Phase 2 — The Developer Overlay 🔥🔥🔥  (the demo)

> Named in `GENERAL_SPEC` §8 as "developer overlay," scheduled nowhere in the old
> roadmap. **This is the thing you show people.** It's what no one-shot capture
> tool can do.

### 2.1 See open pins live on the page

**What:** A dev opens the live site with the extension; all *open* pins for that
URL render floating on their real anchored elements. Hover → snippet. Click →
detail popover with status/assignee/resolve.

**Why:** The dev fixes bugs *in context*, on the actual page, not by tab-switching
to a dashboard and back. This is the loop competitors can't close because their
pins don't persist or re-resolve.

**Acceptance:**
- [ ] Open pins for the current URL render on mount, anchored live
- [ ] Resolve / status change from the overlay writes back (same path as composer)
- [ ] Stale pins render in their last-known position with the stale treatment

**Effort:** L (4–5 days)
**Dependencies:** Phase 1 anchoring; `getPagePins` wired to the API.

### 2.2 "Reproduce this state" deep-link

**What:** Pin detail → opens the captured URL (full query/hash) in a new tab and
flashes *"Viewing the state from pin #4"*, scrolling to + highlighting the pin.

**Why:** One click lands the dev on the exact state with the pin in view. Pairs
with 2.1 to make the overlay the dev's home base.

**Spec:** URL hash `#pinlay-pin=<id>`; content script reads it on mount.

**Effort:** S (1 day)

---

## Phase 3 — The Retention Loop 🔥🔥🔥

> Pins die in a dashboard nobody reopens. Status has to round-trip with where the
> dev already lives. This is the single most important *non-wedge* feature.

### 3.1 Two-way Linear sync

**What:** Pin status + comments roundtrip. Linear → pinlay and pinlay → Linear.

**Why:** Dev updates Linear, pinlay reflects it — no double-bookkeeping. Reviewer
sees real progress without leaving the dashboard. Without this, week-2 retention
is zero.

**Spec:**
- Linear webhook → `apps/api/src/integrations/linear-webhook.ts` → update pin
  status + append comment as activity.
- Outbound: status change → Linear GraphQL `issueUpdate`.
- Mapping (workspace-configurable): `open` ↔ Backlog/Triage; `in_progress` ↔ In
  Progress; `resolved` ↔ Done.
- Loop guard: don't re-emit a webhook-originated change back to Linear.

**Acceptance:**
- [ ] Status change in Linear visible in dashboard within 5s
- [ ] Comments authored in Linear appear as activity with original author
- [ ] No infinite round-trip

**Effort:** L (5–7 days)
**Dependencies:** apps/api, Linear OAuth at workspace level.

### 3.2 PR linking + auto-resolve

**What:** Link a GitHub/GitLab PR to a pin; on merge (webhook) the pin
auto-resolves and records the commit SHA. Dashboard shows a "Fixed in #1234" chip.

**Why:** Closes the loop without anyone touching the dashboard; visible audit trail.

**Effort:** M (2–3 days)
**Dependencies:** apps/api.

---

## Phase 4 — Capture & Triage speed 🔥🔥

> Once real users are filing volume, reduce friction on both ends.

### 4.1 Quick-pin keyboard shortcut
`Cmd/Ctrl+Shift+P` enters place mode; single `P` drops a pin while annotating
(never fires in an input). Shortcut hint in the popup. **Effort:** S (½ day)

### 4.2 Pin templates
Presets that pre-fill severity + type + focus the description: Visual bug · Copy
fix · Functional bug · Crash · Idea · Question · A11y. Last-used persists per
sitting. **Effort:** S (1 day)

### 4.3 Pin dedup on (anchor + URL)
Before the composer opens, if a pin already exists on this element + pathname,
offer *"Comment on it instead?"* Stops 5 reviewers filing the same bug 5 times.
**Effort:** S (1 day) · **Dependencies:** minimal reply on detail popover.

### 4.4 Dashboard keyboard navigation
`j/k` between pins · `e` resolve · `r` reply · `/` search · `?` shortcuts modal.
Linear-style; power users love it, new users don't notice. **Effort:** S (1 day)

---

## Phase 5 — Paid expansion (Team tier) 🔥🔥

> Now — and only now — add the things that justify the $9/seat Team plan already
> designed in `BillingSection`. These deepen the dev loop; they are not the wedge.

### 5.1 Debug bundle (the old Phase 1, demoted on purpose)

**What:** Pins on the Team tier silently attach a `debug` object: browser,
viewport, sanitised URL, last 50 console entries, recent 4xx/5xx network, and
allowlisted feature flags. Capture starts on `start-annotation`, never on page
load (no surveillance of pages the user isn't annotating).

**Why now, not earlier:** This is what makes a *dev* say yes — but it's table
stakes in the repro field, so it can't be our differentiator. As a paid upsell
on top of an anchor moat people already love, it's leverage. As a wedge, it's a
fight with Jam we lose. **Sanitise hard** (redact token/key/secret/password/Bearer).

**Effort:** M (3–4 days) · **Dependencies:** `pins.debug` JSONB column; Team gating.

### 5.2 Action breadcrumbs
Ring buffer of the last 15 actions (click selector / route change / input *type*,
never values). Reuses 5.1's capture session. Workspace-toggleable for compliance.
**Effort:** S (1 day) · **Dependencies:** 5.1

### 5.3 10-second screen-clip ring buffer
`getDisplayMedia({ preferCurrentTab: true })`, 1s timeslice, keep last 10 chunks;
on pin drop, attach the webm. Per-workspace opt-in. The premium repro feature —
only worth it once the loop above is real. **Effort:** L (5–7 days) ·
**Dependencies:** R2/S3 blob storage, Team gating.

---

## Phase 6 — Collab & scale 🔥  (post-PMF)

| # | Item | Effort |
|---|---|---|
| 6.1 | Live cursors + presence on the same page (realtime channel) | L |
| 6.2 | Comments + @mentions on pin detail | M |
| 6.3 | Notification controls + daily digest (per-pin watching) | S |

---

## Phase 7 — Polish

| # | Item | Effort |
|---|---|---|
| 7.1 | First-pin onboarding tour (3-step, on first annotation) | S |
| 7.2 | Auto-stale lifecycle (no activity 30d + URL unreachable → `stale`) | S |
| 7.3 | Workspace-level custom pin templates (extends 4.2) | S |
| 7.4 | Lucide tree-shake in `Icon.vue` (dynamic map, ~−600KB popup bundle) | S |
| 7.5 | Page-side runtime moved to `packages/inject` | M |

---

## Resolved decision — backend stack

**Settled (2026-05-30): NestJS + Prisma + Postgres.** The scaffolded `apps/api`
was already NestJS/Prisma; the specs (`GENERAL_SPEC` §3–4, `BACKEND_SPEC`) and
`HANDOFF.md` were reconciled to match — the original Hono/Cloudflare-Workers/
Drizzle/R2/Queues plan is dropped. Storage is inline data-URL for v1 (object
storage when clips land); async is inline for v1 (a queue lib when sync /
notifications need it). Phase 6.1 realtime moves to a standard websocket
service rather than Durable Objects.

---

## Sequencing — the next 6 weeks

| Week | Focus | Outcome |
|---|---|---|
| 1 | **Phase 0 validation** (5 real users) + any blocking 0.5–0.7 fixes | Evidence the wedge is real — go/no-go |
| 2 | 1.1 health badge · 1.2 anchor hardening (start) | A measured resolve rate |
| 3 | 1.2 (finish) · 1.3 suggested re-anchor | Pins provably survive a deploy |
| 4 | 2.1 developer overlay (start) · backend decision | The demo takes shape |
| 5 | 2.1 (finish) · 2.2 deep-link · 3.1 Linear sync (start) | Devs resolve in context |
| 6 | 3.1 Linear sync (finish) · 3.2 PR auto-resolve | Status round-trips; loop closed |

The launch story is: **"Drop a pin on your live app → it stays anchored through
your next deploy → your dev sees it on the page and resolves it → Linear updates
itself."** Debug bundles and screen clips are how we charge for it later, not how
we win the first user.

## Out of scope for v1

- Mobile / native app · Figma plugin · AI auto-triage · standalone a11y-audit mode
- Multi-page session recordings

Post-PMF bets, not v1 bets.
