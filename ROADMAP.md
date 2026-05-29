# pinlay — Product Roadmap

> Prioritized improvement plan for the browser extension + dashboard.
> Ordering is by **user value per unit of build effort**, not by what's most fun
> to build. Personas referenced throughout: **QA** (files the pin), **Dev**
> (fixes the bug), **Reviewer** (PM/designer triaging).

---

## Phase 0 — Foundation polish (in flight)

Small UX correctness fixes. These are the difference between "looks like a
demo" and "feels like a product." Ship before anything else.

| # | Item | Status |
|---|---|---|
| 0.1 | Edge-clamp composer + detail popovers (no overflow at viewport edges) | ✅ done |
| 0.2 | Sticky place mode (one click = one pin, Esc / FAB to exit) | ✅ done |
| 0.3 | Polished toolbar popup with account + workspace + preferences | ✅ done |
| 0.4 | Canvas `willReadFrequently` perf fix in markup tool | ✅ done |
| 0.5 | Severity / status / type icon dictionary audit (no missing lucide names) | open |
| 0.6 | Loading + error empty states for `getPagePins` while API is wiring up | open |
| 0.7 | Disable submit during `submitting` (already partly wired — audit pass) | open |

---

## Phase 1 — Repro Layer 🔥🔥🔥
> **Single biggest leverage point in the whole roadmap.** Devs can't fix what
> they can't reproduce. Attach context to every pin automatically; the QA
> doesn't have to think about it.

### 1.1 Debug bundle (auto-attached)

**What:** Every pin payload silently includes a `debug` object with:
- `browser`: `{ name, version, os, locale }`
- `viewport`: `{ width, height, dpr, theme: "light"|"dark"|"auto" }`
- `url`: full URL + sanitised query string (allowlist of params, redact `token|key|secret|password`)
- `console`: last 50 console entries (`{ level, message, timestamp }`) — captured by patching `console.{log,info,warn,error}` on content-script mount
- `network`: 4xx/5xx requests in the last 30s (`{ url, method, status, duration, timestamp }`) — captured via `PerformanceObserver` on `resource` entries
- `featureFlags`: allowlisted `localStorage` / `cookie` keys (configurable per workspace)

**Why:**
- **Dev:** Opens issue → already knows browser, OS, viewport, recent errors, failing API calls. No more "what browser were you on?" ping-pong.
- **QA:** Files faster because the heavy lifting is invisible.

**Spec:**
- New `apps/extension/src/lib/debug-capture.ts` exporting:
  ```ts
  startDebugCapture(): DebugSession  // patches console + network listeners
  snapshotDebug(session): DebugBundle  // call at pin-drop time
  stopDebugCapture(session): void  // on annotation end
  ```
- Patches happen on `pinlay:start-annotation`, not on content-script mount, to avoid surveilling pages where the user isn't annotating.
- Bundle attached to `PinDraft` as `debug?: DebugBundle`.
- API: `pin.debug` JSONB column on `pins` table.

**Acceptance:**
- [ ] Pin created → debug bundle visible on detail popover under a "Debug" disclosure
- [ ] Dashboard pin page renders the bundle as collapsible sections
- [ ] No secret-looking strings (token / key / password / Bearer) survive sanitisation
- [ ] Console patching does not leak when annotation ends

**Effort:** M (3–4 days)
**Dependencies:** apps/api `pins.debug` column

### 1.2 Action breadcrumbs

**What:** Ring buffer of the last 15 user actions (click on selector, route change, form-input event types — **never values**) attached to the pin as `breadcrumbs: Crumb[]`.

**Why:**
- **Dev:** Sees the path to the bug. "User clicked Sign in → /onboarding → clicked Skip → pin." Reproduces in 30 seconds instead of 30 minutes.

**Spec:**
- Reuse the debug-capture session. Patch `document.addEventListener("click", …, capture)` and observe `history.pushState` / `popstate` / `hashchange`.
- Crumb shape: `{ type: "click"|"route"|"input", at: ISO, target?: stableSelector, url?: string }`.
- Input crumbs record `type`/`name` of the input only — no values.

**Acceptance:**
- [ ] Breadcrumbs render as a vertical timeline on the dashboard pin page
- [ ] Toggleable in workspace settings (some teams will want it off for compliance)
- [ ] Test plan: simulate 50 events in 1 second — buffer caps at 15, no leak

**Effort:** S (1 day)
**Dependencies:** 1.1

### 1.3 DOM snapshot of anchored element

**What:** At pin-drop time, capture compressed HTML of the anchored element + 2 ancestors + computed styles (whitelist of layout properties only — no `background-image: url(...)`).

**Why:**
- **Dev:** Even if the page changes before they look, they can see what the element looked like at capture. Critical for visual / DOM bugs.
- **Anchor resilience:** Snapshot diffed against live DOM in Phase 4.3 (suggested re-anchor).

**Spec:**
- `apps/extension/src/lib/dom-snapshot.ts`:
  ```ts
  snapshotAnchor(el: Element): DomSnapshot
  // returns { html, computedStyles, ancestorsSnippet, bbox }
  ```
- Gzip via `CompressionStream` (~1–5 KB per snapshot).
- Attached to pin as `domSnapshot: { gz: base64, ... }`.

**Acceptance:**
- [ ] Pin detail "Inspect captured DOM" button opens a modal with the snapshot rendered in a sandboxed iframe + computed-styles table
- [ ] Snapshot size always under 20 KB compressed (cap + truncate if larger)

**Effort:** M (2 days)
**Dependencies:** apps/api `pins.dom_snapshot` column

---

## Phase 2 — Capture Speed 🔥🔥

> QA workflows die at "this composer is annoying to fill out." Reduce taps,
> add affordances, give them keyboard shortcuts.

### 2.1 Quick-pin keyboard shortcut

**What:** `Cmd/Ctrl + Shift + P` on any page → instantly enters place mode. Single-key `P` while annotating drops a pin at the current mouse position.

**Why:**
- **QA:** Files a pin in 1 keystroke instead of "open extension → click button."
- **Reviewer:** Multi-pin reviews stop feeling tedious.

**Spec:**
- `chrome.commands` declaration in `wxt.config.ts` for the global toggle.
- Content-script keydown listener while annotation is active for the in-page `P`.
- Surface the shortcut in the toolbar popup CTA as a `⌘⇧P` kbd pill.

**Acceptance:**
- [ ] Global shortcut documented in extension manifest (user-rebindable in `chrome://extensions/shortcuts`)
- [ ] Shortcut hint shown in popup
- [ ] Does not fire while focus is in an input

**Effort:** S (½ day)

### 2.2 Pin templates

**What:** Pre-set composer states. Tap "Visual bug" → severity = `low`, type = `visual`, focus the description. Tap "Crash" → severity = `critical`, type = `bug`.

Templates: **Visual bug · Copy fix · Functional bug · Crash · Idea · Question · A11y**

**Why:**
- **QA:** 4 clicks down to 1 for the 80% case.

**Spec:**
- New `lib/pin-templates.ts` with the 7 presets above as exported config.
- Composer renders a horizontal scroll row of template chips above the severity row.
- Selected template persists for the current sitting (next pin defaults to same template until changed).
- Workspace-level custom templates (Phase 7).

**Acceptance:**
- [ ] Template chip row collapses on viewports < 400px
- [ ] "Last used" template restored on next annotation session (chrome.storage.local)

**Effort:** S (1 day)

### 2.3 Multi-viewport sweep

**What:** Composer footer button: "Capture at 3 sizes." Cycles tab viewport through 375 / 768 / 1280 (configurable), screenshots each, attaches all three.

**Why:**
- **QA:** Files responsive bugs as a single pin instead of three.
- **Dev:** Sees the bug across breakpoints without re-querying.

**Spec:**
- Background SW orchestrates: `chrome.debugger.attach` → `Emulation.setDeviceMetricsOverride` → wait → `Page.captureScreenshot` → repeat → detach.
- Requires `debugger` permission — only request on first use with an explainer modal.

**Acceptance:**
- [ ] Three screenshots attached with breakpoint label overlay
- [ ] Falls back to single screenshot if `debugger` permission denied
- [ ] Restores viewport on completion (or page reload if attach fails)

**Effort:** M (3 days)
**Dependencies:** debugger permission gate

### 2.4 Pin dedup on (anchor + URL)

**What:** Before creating a pin, check existing pins on this URL with a matching stable anchor. If found, surface: **"A pin already exists here — comment on it instead?"** with the existing pin's snippet.

**Why:**
- **Reviewer:** Stops 5 different reviewers from filing the same bug 5 times.

**Spec:**
- Client-side check before composer opens. Match on `anchor.stableAttr` exact + URL pathname exact.
- If match found, show a 200ms transient inline card on the composer header.
- "Comment on existing" → closes composer, opens detail popover, focuses reply.

**Acceptance:**
- [ ] Match detected within 100ms of click
- [ ] Manually overrideable ("File new anyway")
- [ ] Doesn't trigger across different pathnames even with the same anchor

**Effort:** S (1 day)
**Dependencies:** Reply support on detail popover (currently removed — restore minimal version)

---

## Phase 3 — Dev Loop 🔥🔥🔥

> Pins die in the dashboard if devs can't act on them inside their normal
> workflow. Linear/Jira/GitHub integration is the difference between adoption
> and tab-switching frustration.

### 3.1 Two-way Linear sync

**What:** Pin status updates flow Linear → pinlay and pinlay → Linear. Comments roundtrip.

**Why:**
- **Dev:** Lives in Linear. Updates Linear, pinlay reflects the change. No double-bookkeeping.
- **Reviewer:** Sees real progress without leaving the dashboard.

**Spec:**
- Linear webhook → `apps/api/src/integrations/linear-webhook.ts` → updates pin status + appends comment as activity event.
- Outbound: pin status change → Linear GraphQL `issueUpdate`.
- Mapping: pinlay `open` ↔ Linear `Backlog`/`Triage`; `in_progress` ↔ `In Progress`; `resolved` ↔ `Done`. Workspace-configurable.

**Acceptance:**
- [ ] Status change in Linear visible in dashboard within 5s
- [ ] Comments authored in Linear show up as pinlay activity with original author attribution
- [ ] Round-trip loop guard (don't re-emit a webhook-originated change back to Linear)

**Effort:** L (5–7 days)
**Dependencies:** apps/api, Linear OAuth installed at workspace level

### 3.2 PR linking + auto-resolve

**What:** Paste a GitHub/GitLab PR URL into a pin. When the PR merges (via webhook), pin auto-moves to `resolved` and stores the commit SHA. Resolved pins on the dashboard show a "Fixed in #1234" chip.

**Why:**
- **Dev:** Closes the loop without touching the dashboard. Provides a visible audit trail.
- **Reviewer:** Sees what was fixed by what commit.

**Spec:**
- New `pin.linkedPrUrl` field + GitHub webhook handler.
- On `pull_request.closed` with `merged=true`, find pins linked to that PR, transition to `resolved`, record `resolvedByCommit`.

**Acceptance:**
- [ ] PR chip on dashboard pin card with merge state colour
- [ ] Reverted PRs surface a warning chip on the pin

**Effort:** M (2–3 days)
**Dependencies:** apps/api

### 3.3 "Open this state" deep-link

**What:** Pin detail has a button: **"Reproduce this state"**. Opens the captured URL in a new tab + flashes a banner in the page: *"You're viewing the URL state from pin #4. Click the pin to inspect."*

**Why:**
- **Dev:** One click to land back on the exact URL with the exact query/hash + the pin highlighted.

**Spec:**
- URL contains a hash param `#pinlay-pin=<id>`. Content script reads it on mount → flashes the banner → scrolls to and highlights the pin.

**Acceptance:**
- [ ] Banner dismissible
- [ ] Banner does not appear if the user opens a pinlay URL without the hash

**Effort:** S (1 day)

---

## Phase 4 — Triage 🔥🔥

> Once volume grows, the dashboard is where people live. Make it keyboard-fast
> and surface what matters.

### 4.1 Dashboard keyboard navigation

**What:** `j/k` between pins · `e` resolve · `r` reply · `/` search · `c` comment · `g i` go to inbox · `?` shortcuts modal.

**Why:** Linear-style. Power users will love it; new users won't notice.

**Spec:** New composable `useKeyboardNav.ts` in `apps/web/src/lib/`.

**Effort:** S (1 day)

### 4.2 Anchor health badge + dead-anchor filter

**What:** Each pin shows a small health indicator:
- 🟢 **Resolves** via stable-attr or selector
- 🟡 **Fallback** to bounding rect only
- 🔴 **Dead** — no resolve, no fallback target

Filter: "Show only dead anchors" → bulk re-anchor or archive workflow.

**Why:**
- **Dev:** Knows immediately if the pin is still pointing at something.
- **Reviewer:** Can clean up after a refactor in one pass.

**Spec:**
- Health checked client-side when the dashboard pin card mounts (via a hidden iframe to the page — fast) OR server-side on a nightly job that fetches the page headless.
- Cache result on pin row, refresh on demand.

**Acceptance:**
- [ ] Dead-anchor filter pill in dashboard sidebar
- [ ] Bulk "Archive dead pins" action

**Effort:** M (3 days)
**Dependencies:** dom-snapshot from 1.3 (used for diff)

### 4.3 Suggested re-anchor

**What:** When stable-attr is gone, compare the captured DOM snapshot to the live DOM (Levenshtein on text content + tag structure) and surface a suggestion: *"Did this pin move here?"* with a thumbnail.

**Why:**
- **Reviewer / Dev:** Refactors don't kill the issue trail.

**Spec:** Heuristic match in browser; show top candidate with confidence score.

**Effort:** M (2–3 days)
**Dependencies:** 1.3, 4.2

### 4.4 "Inspect anchor" jump-to button

**What:** Detail popover button: opens the page, scrolls to the pin, highlights the anchored element (same outline the composer uses).

**Effort:** S (½ day)

---

## Phase 5 — Replay 🔥🔥🔥

> If we ship one premium feature this quarter, it's this. Jam's moat.

### 5.1 10-second screen-clip ring buffer

**What:** While annotation is active, a 10s MediaRecorder ring buffer runs in the background. On pin drop, the last 10s clip is attached to the pin as `video/webm`.

**Why:**
- **Dev:** Sees what the user did *just before* the bug. The single highest-leverage repro aid in the industry.
- **QA:** No more "let me record this and start over."

**Spec:**
- `getDisplayMedia` with `preferCurrentTab: true` to skip the picker.
- MediaRecorder with 1s timeslice, keep last 10 chunks.
- On pin drop → join chunks, encode to webm, upload.
- User-toggleable per-workspace (privacy-sensitive teams will want it off).

**Acceptance:**
- [ ] First annotation prompts for screen-capture permission with a clear explainer
- [ ] Clip player on dashboard with seekbar + 1× / 0.5× / 2× speeds
- [ ] Disabled state when permission denied — annotation still works

**Effort:** L (5–7 days)
**Dependencies:** Storage backend for video blobs (R2 / S3)

---

## Phase 6 — Collab 🔥

> Multi-reviewer sessions stop being a free-for-all when there's presence.

### 6.1 Live cursors + presence

**What:** When two reviewers are on the same page at the same time, each sees the other's cursor + a small avatar header in the FAB.

**Why:** Reduces duplicate pins. Feels like a product, not a tool.

**Spec:** Realtime channel (Cloudflare Durable Object or Liveblocks). Throttle cursor at 30fps.

**Effort:** L (4–5 days)
**Dependencies:** apps/api realtime infra

### 6.2 Comments + @mentions

**What:** Pin detail gets a reply thread (restore the removed footer with a minimal version). `@` brings up a workspace member picker. Mentions notify on dashboard + integrations.

**Effort:** M (3 days)

### 6.3 Notification controls

**What:** Per-pin "watching" state. Default: author + assignee. Workspace digest email (daily summary, not per-event).

**Effort:** S (1 day after 6.2)

---

## Phase 7 — Polish

> Things that quietly raise the floor.

| # | Item | Effort |
|---|---|---|
| 7.1 | First-pin onboarding tour (3-step modal triggered on first annotation) | S |
| 7.2 | Auto-stale lifecycle: pins with no activity for 30 days + URL unreachable → `stale` | S |
| 7.3 | Workspace-level custom pin templates (extends 2.2) | S |
| 7.4 | Lucide tree-shake: `Icon.vue` switches from `import * as icons` to name-keyed dynamic map → cuts bundle ~600KB | S |
| 7.5 | Inject runtime moved to `packages/inject` (per spec) | M |
| 7.6 | Severity / type taxonomy localisation | S |

---

## Sequencing — the next 6 weeks

| Week | Focus | Outcome |
|---|---|---|
| 1 | Phase 0 leftovers · 1.1 Debug bundle (start) | Polish ship + debug capture skeleton |
| 2 | 1.1 Debug bundle (finish) · 1.2 Breadcrumbs | Every pin self-explains why it broke |
| 3 | 2.1 Quick-pin · 2.2 Templates · 2.4 Dedup | QA workflow feels fast |
| 4 | 3.1 Linear sync (start) · 4.1 Keyboard nav · 3.3 Deep-link | Dev-loop closes |
| 5 | 3.1 Linear sync (finish) · 3.2 PR auto-resolve | Status round-trips |
| 6 | 5.1 Screen clip | Repro story complete; ready for beta |

Anything past week 6 ships post-beta. The launch story is: **"Drop a pin
→ dev gets a full repro bundle → fixed in their existing PR workflow."**

---

## Out of scope for v1

- Mobile / native app
- Figma plugin
- AI auto-triage / auto-tag
- A11y audit mode (separate product surface)
- Multi-page session recordings (vs single-page clips)

These are post-PMF bets, not v1 bets.
