# pinlay — Product Roadmap

> Prioritized plan for the browser extension + dashboard.
> Ordering is by **evidence and leverage**, not by what's most fun to build.
> Personas: **QA** (files the pin), **Dev** (fixes the bug), **Reviewer**
> (PM/designer triaging).
>
> _Rewritten 2026-07-10. Supersedes the 2026-05-30 roadmap. Two changes:
> (1) a new Phase 0 — cut the product to its simple core before validating,
> because the demo IS the product; (2) the dashboard is re-scoped from a
> workspace app to a **pin inbox**. The wedge is unchanged._

---

## Positioning — the one decision everything hangs on

pinlay is **persistent, anchored comments for your live web app** — the pins
stick to real DOM elements, survive deploys, and a developer can walk through
the open ones *on the live page* and resolve them in context.

That sentence is the wedge. It is the one thing the crowded field around us
(Marker.io, BugHerd, Userback, Ruttl, Pastel) does **not** do well, and the one
thing the funded repro-tools (Jam.dev, Bird Eats Bug) don't do at all.

**What pinlay is NOT — and must never look like:**
- **Not a project-management tool.** No boards-first UI, no triage matrices,
  no workflow configuration. If a screen would look at home in Jira, it's wrong.
- Not a screen recorder or repro-bundle tool (that returns as a paid tier, later).
- Not a dashboard product. **The extension is the product; the dashboard is an
  inbox** you glance at, not a place you live.

### Product principles (apply to every future feature)

1. **One noun: Pin.** Users drop pins, see pins, resolve pins. "Issues",
   "sessions", "boards", "pinboards" never appear in the UI. (The DB schema can
   keep its shape — this is a presentation rule.)
2. **Time-to-first-pin is the north-star metric.** Every field, click, and nav
   item is judged by whether it delays a pin.
3. **Don't show what doesn't work.** No mock pages, no dead buttons, no
   "coming soon" placeholders in the shipped UI. A missing feature costs less
   trust than a fake one.
4. **Defaults over decisions.** Severity, type, labels, assignee all have
   defaults; asking is opt-in ("More options"), never the happy path.
5. **The dev-facing surface is the live page** (the overlay), not the dashboard.

---

## Phase 0 — Cut to the core 🔥🔥🔥  (the simplicity rebuild)

> One week of mostly *removal*. This precedes validation because the current
> dashboard demos as a mini-Jira and invites comparison with tools we don't
> want to compete with. Nothing here adds features; it removes decisions.

### 0.1 Composer: comment + screenshot + Send

**What:** The extension composer's happy path becomes exactly three things —
auto-captured screenshot, one comment box, one Send button.
- **Auto-capture the visible tab on pin drop** (`CAPTURE_VISIBLE_TAB` already
  exists in the background SW). Attach silently; user can remove or re-crop.
- Severity / issue type / labels / assignee collapse behind a **"More"**
  disclosure. Defaults: `medium` / `other` / none / unassigned.
- Keep the markup editor (bold/italic/link) — it's lightweight and useful.

**Why:** This is the single biggest UX lever in the product. Marker.io wins on
"click → screenshot already there → type → done." Currently we ask five
questions and make screenshots manual.

**Effort:** M (2 days)

### 0.2 Dashboard rebuild: the Pin Inbox

**What:** The dashboard becomes two screens plus settings. Data model is
untouched — this is presentation.

**Screen 1 — Pins (the feed, route `/`):**
- A single reverse-chron list of **pins** (not issue cards). Each row:
  screenshot thumbnail · comment (first line, as the title) · page URL ·
  status dot · reporter avatar · age.
- Filter chips across the top: **Open · Resolved · All**, plus a site filter
  (auto-populated from pin page URLs) and the existing search.
- No boards column, no severity heat bars, no counts matrix. If a row needs a
  legend, it's too complex.
- Empty state IS the onboarding: ① Install the extension ② Open your site
  ③ Drop a pin — with the install link right there.

**Screen 2 — Pin detail (route `/p/:pinId`, `/s/:id` redirects):**
- Screenshot viewer (keep — including the new multi-image thumbnail strip)
- Comment + reply thread (keep)
- Status control + **"Open on page"** as the single primary button — it is
  the wedge, it gets the loudest visual weight.
- Everything else (copy link, delete) inside one "…" menu.
- Anchor forensics (Tag/Role/CSS selector/XPath) collapse behind a
  **"Developer details"** disclosure, closed by default. The visible trust
  signal is the green/amber/red anchor-health chip only.
- If the same sitting produced sibling pins, show them as small pills
  ("2 more pins on this page") — not a persistent sidebar panel.

**Nav (sidebar):** exactly two items — **Pins** and **Settings** — plus the
workspace avatar. Remove: Integrations page (mock), Boards section (CRUD +
assignment UI), Dashboard/overview remnants.

**Settings:** Profile · Team (workspace name + members + invites merged into
one section) · Danger zone. **Remove Billing and Notifications tabs** until
those systems exist.

**Kill list (delete or feature-flag off, don't redesign):**
| Surface | Action |
|---|---|
| Integrations page + `useIntegrations` | Remove from nav; delete route |
| "View in Linear" buttons on pin detail | Delete until Phase 4 ships |
| Boards sidebar CRUD + "Add to board" | Hide; keep API for later |
| Settings → Billing / Notifications | Hide tabs |
| Issue-level status/severity aggregation UI | Drop from feed rows |
| `SyncChip`, unused `SESSIONS` ref | Delete (already flagged as dead) |

**Naming pass:** "Pinboards" → "Pins" in the sidebar; breadcrumbs say "Pins";
auto-title sessions from **page title + date** instead of "Untitled review ·
host". One noun everywhere.

**Effort:** L (3–4 days, mostly deletion + one new feed component)

### 0.3 Onboarding path

**What:** After signup, land on the empty-state Pins feed (see 0.2) with the
extension install CTA. After the first pin arrives, the empty state never
shows again.
**Effort:** S (½ day, falls out of 0.2)

**Phase 0 acceptance:**
- [ ] A new user can go signup → install → first pin without reading anything
- [ ] The composer's happy path is ≤ 2 decisions (comment text, Send)
- [ ] The dashboard has exactly 2 nav destinations
- [ ] Zero dead/mock controls anywhere in the shipped UI

---

## Phase 1 — Validation 🔥🔥🔥  (no code)

> Unchanged from the old roadmap, now with a demo that matches the pitch.

| # | Item | Status |
|---|---|---|
| 1.1 | Recruit 5 real users (QA / designer / PM at small product teams) | open |
| 1.2 | Watch each drop pins on *their own* live site, unscripted, screen-shared | open |
| 1.3 | Capture: where they hesitate, what they expected, would-they-pay | open |
| 1.4 | Kill / keep / change decision on the wedge | open |
| 1.5 | Instrument **time-to-first-pin** (install → first pin submitted) | open |

**Acceptance:** You can name 5 people who used it and quote what each said.
If you can't find 5 who'll *try* it, that's the most important signal on this
page.

---

## Phase 2 — The Anchor Moat 🔥🔥🔥

> The only genuinely hard, genuinely *ours* problem. Status: substantially
> built — resolve chain + health bands + test harness exist (extension side);
> re-anchor suggestions ship in the overlay.

### 2.1 Anchor-health chip on pin detail (dashboard side)
🟢 Resolves · 🟡 Re-found (may have moved) · 🔴 Not found — cached on the pin
row, written back by the extension when it resolves. The *only* anchor info
visible by default (the rest sits in "Developer details").
**Effort:** S–M (1–2 days) · extension already computes the band.

### 2.2 "Survives a deploy" number
The jsdom mutation harness exists (9/9 scenarios). Re-run against 2–3 real
sites' deploys; publish the resolve-rate number on the landing page.
**Effort:** S (1 day of measurement)

---

## Phase 3 — The Developer Overlay 🔥🔥🔥  (the demo)

> Status: largely built (opt-in "View pins", resolve from overlay, stale
> treatment, re-anchor). Remaining:

### 3.1 "Reproduce this state" deep-link
Pin detail → **Open on page** opens the captured URL (full query/hash) with
`#pinlay-pin=<id>`; content script scrolls to + flashes the pin.
**Effort:** S (1 day)

### 3.2 Hover snippet on overlay pins
Hover → comment snippet card. Click-through already works.
**Effort:** S (½ day)

---

## Phase 4 — The Retention Loop 🔥🔥

> Pins die in an inbox nobody reopens. Status has to round-trip with where the
> dev already lives. **This is when integrations re-enter the UI** — as a
> single "Connect Linear" button in Settings → Team, not a catalogue page.

### 4.1 Two-way Linear sync
Webhook in (status + comments), GraphQL out, workspace-level mapping, loop
guard. Acceptance: change in Linear visible in pinlay within 5s; no infinite
round-trip. **Effort:** L (5–7 days)

### 4.2 PR linking + auto-resolve (GitHub)
On merge, the pin auto-resolves with a "Fixed in #1234" chip.
**Effort:** M (2–3 days)

---

## Phase 5 — Capture & triage speed 🔥

Carried over; all still valid, all post-validation:
quick-pin shortcut (partially shipped) · pin templates · dedup on
(anchor + URL) · `j/k` keyboard nav in the inbox.

---

## Phase 6 — Paid expansion (Team tier)

Unchanged: debug bundle (browser/console/network capture, sanitised hard) ·
action breadcrumbs · 10-second screen-clip ring buffer. **Billing UI returns
here** — not before. Object storage prerequisite: ✅ done (R2, 2026-07-09).

## Phase 7 — Collab & scale (post-PMF)

Live cursors · @mentions · notification digest. Notifications settings UI
returns here.

---

## Sequencing — the next 6 weeks

| Week | Focus | Outcome |
|---|---|---|
| 1 | **Phase 0** (0.1 composer → 0.2 inbox → 0.3 onboarding) | The product demos as "drop a pin", not "manage a project" |
| 2 | **Phase 1 validation** with 5 real users | Go / no-go evidence + time-to-first-pin baseline |
| 3 | 2.1 health chip · 2.2 deploy number · fixes from validation | Trust signals visible; feedback folded in |
| 4 | 3.1 deep-link · 3.2 hover snippet | Dev loop closes on the live page |
| 5–6 | 4.1 Linear sync · 4.2 PR auto-resolve | Status round-trips; week-2 retention has a reason to exist |

The launch story is unchanged: **"Drop a pin on your live app → it stays
anchored through your next deploy → your dev sees it on the page and resolves
it → Linear updates itself."**

## Out of scope for v1

Mobile/native · Figma plugin · AI auto-triage · multi-page recordings ·
boards/workflow customisation · anything that makes the inbox look like Jira.

---

## Resolved decisions

- **Backend (2026-05-30):** NestJS + Prisma + Neon Postgres.
- **Storage (2026-07-09):** Cloudflare R2, presigned direct PUT for web,
  server-proxied multipart for the extension. No local fallback.
- **Dashboard scope (2026-07-10):** The dashboard is a **pin inbox** — two nav
  destinations, pin-centric feed, single-pin detail. The Session→Issue→Pin
  schema stays; flattening is presentation-only. Boards/Integrations/Billing
  UI removed until their phase arrives.
