# Extension Spec (`apps/extension`)

The capture surface. A browser extension that lets users drop pins on any live web
page and view existing pins in context. WXT + Vue 3, overlays mounted via shadow
DOM. Keep it fast, visual, precise, and privacy-safe.

> The dashboard is buildable and demoable without this. Treat the extension as a
> parallel track; the API contract (BACKEND_SPEC) is the seam between them.

> 🔭 **Build from the DevProbe reference.** When it's time to build this, do NOT
> start from scratch — DevProbe already ships a working WXT + Vue live-annotation
> extension. Port and trim it. Full file map in **§0** below.

## 0. Reference implementation — DevProbe

DevProbe's extension is the blueprint. It solved shadow-DOM mounting, element
anchoring, the pin overlay, the composer, and screenshot markup already. **Copy the
patterns, port the code to `@pinlayer/*`, and strip everything tied to screen
recording / console / network.**

Repo root: `/Users/apple/Documents/code/deveprobe-report/`

| What you need | Where it is in DevProbe |
|---|---|
| Annotation overlay (VIEW/PLACE modes, pin render) | `apps/extension/src/components/capture/annotation/AnnotationOverlay.vue` |
| Pin marker / composer / detail / list / toolbar | `apps/extension/src/components/capture/annotation/{AnnotationPin,AnnotationPinComposer,AnnotationPinDetail,AnnotationPinList,AnnotationToolbar}.vue` |
| Element anchoring (resolution-order logic) | `apps/extension/src/lib/anchor.ts` |
| Annotation overlay state | `apps/extension/src/lib/annotation-state.ts` |
| Content script (shadow-DOM mounting) | `apps/extension/src/entrypoints/content.ts` |
| MAIN-world page probe | `apps/extension/src/entrypoints/page-probe.content.ts` |
| Background (API proxy, tab capture, auth) | `apps/extension/src/entrypoints/background.ts` |
| Floating launcher / connect prompt | `apps/extension/src/components/launcher/{FloatingLauncher,ConnectPrompt,LauncherItem}.vue` |
| Screenshot markup (shape-based canvas, tools) | `apps/extension/src/components/capture/screenshot/annotation/{AnnotationCanvas,AnnotationToolbar}.vue` + `useAnnotationCanvas.ts` |
| Browser metadata + redaction helpers | `apps/extension/src/lib/{metadata,redact}.ts` |
| WXT + Tailwind config | `apps/extension/{wxt.config.ts,tailwind.config.ts}` |
| API client pattern | `apps/extension/src/lib/api.ts` |

Also read DevProbe's `LIVE_ANNOTATION_SPEC.md` (repo root) — pinLayer's annotation
behaviour is derived from it. **Drop** DevProbe's `capture/recording/*`,
`capture-streams.ts`, `recording-*`, and the offscreen recording host — pinLayer
does not record.

## 1. Surfaces & entry points

- **Popup** — launcher only. Connection status, "Start annotation", "Open current
  page issues", account. It captures/launches; it never hosts compose forms.
- **Content script** — mounts the on-page overlay (shadow DOM). Two modes: VIEW
  (existing pins) and PLACE (dropping a pin).
- **Background** — API proxy, tab capture (`captureVisibleTab`), auth storage.
- **Floating launcher** — optional on-page FAB to start annotation / toggle overlay.
- Entry triggers: popup button, FAB, keyboard shortcut, dashboard "Open on page",
  dashboard "New session" deep-link.

## 2. Annotation modes

**Quick Pin** — Annotate → hover-highlight mode → click element → composer opens →
write comment (+ optional screenshot) → submit or save draft.

**Multi-Pin Session** — start session → drop many pins → move between them via page
or pin list → each pin persists immediately → finish & submit the session. A
14-pin review is **one session**, surfaced as one dashboard card.

**Developer Overlay** — open extension on a URL → see open-pin count → enable
overlay → pins render on the live page → open/comment/restatus/resolve/jump to full
issue in the dashboard.

## 3. Overlay UX

- Root layer is inert (`pointer-events:none`); re-enable per interactive child
  (toolbar, pin markers, place-capture layer). (DeveProbe gotcha — inheritance.)
- Hover highlight: outlined box + optional element label tooltip.
- Don't block scroll except while placing/dragging a pin.
- States: idle · hovering · composer-open · dragging · screenshot-markup ·
  session-review · developer-view · uploading · failed-with-retry.
- `Esc` exits; undo for last pin action; warn before leaving with unsaved pins.
- Exclude overlay chrome from screenshots by default.

## 4. Pin placement & anchoring

Pins land exactly where clicked and survive scroll/reload when the element exists.

Stored per pin: element anchor, click offset (% within element), viewport box at
capture, page URL + route, scroll position, device pixel ratio, screenshot crop.

**Anchor fields:** css selector · xpath · tag · role · accessible name · text
fingerprint · attribute fingerprint (id, name, data-testid, aria-label, href, type)
· ancestor fingerprint · bounding box · viewport size · DPR · scroll · url path.

**Resolution order:** stable test/semantic attrs → id → unique role+name → unique
text fingerprint → css selector → xpath → bounding-box fallback. Mark **stale**
when none resolve; allow re-anchor.

## 5. Pin composer

Fields: **comment** (required) · issue type (visual / layout / copy / broken /
missing element / a11y / perf / other) · severity (low/med/high/critical, default
medium) · priority (optional, AI-suggestable) · assignee · labels · screenshot ·
short clip · link to existing issue.

Smart defaults `[later]`: type/severity suggested from comment, project inferred
from URL, assignee from ownership rules, duplicate warning before submit.

## 6. Screenshot markup

Tools: crop, rectangle, arrow, line, pen, text, highlight, blur, numbered callouts,
undo/redo, reset. Markup is **shape-based** (replayable), never raster snapshots —
keeps undo cheap and items individually editable (DeveProbe learning). Blur samples
from the original image (idempotent). Export a final PNG; blur/redaction happen
**before** upload.

## 7. Short clip `[later]`

≤60s, no console/network capture, countdown + stop, attaches to the pin (not the
session), deletable/re-recordable before submit.

## 8. Privacy & safety

- Manual blur before upload; auto-detect sensitive fields and offer blur.
- Never capture typed password values.
- No console/network collection in annotation mode (this is not the recorder).
- Warn before publishing a public link; allow draft deletion.
- Overlay UI excluded from captures by default.

## 9. Persistence & sync

Live persistence: the session + grouping issue are created lazily on the **first**
pin; every later pin saves immediately, so a review survives a tab close. Revisiting
the URL + entering annotation refetches existing pins via the API.

## 10. Technical guardrails (from DeveProbe)

- Mount overlays with WXT `createShadowRootUi()`; never hand-roll `attachShadow()`
  (scoped CSS lands in `<head>`, not the shadow root).
- After mount, style the shadow host fixed/0-size/`pointer-events:none`, then set
  `pointer-events:auto` on each interactive overlay root.
- Register all `chrome.runtime.onMessage` listeners synchronously, before any
  `await` in `main()`.
- `chrome.tabs`/`captureVisibleTab` live in the background worker, not content.
- Shadow-DOM Tailwind: `darkMode:'media'`; import the shared token CSS into the
  content style bundle.

## 11. Acceptance criteria

- Create a pin with comment in <15s.
- Pin reappears at the clicked point after scroll + reload when the element exists.
- 20+ pins in a session without visible jank.
- Overlay exits cleanly with unsaved work preserved.
- Markup can blur sensitive areas before upload.
- Developer can open current-page issues and change status.
- Stale anchors are visible and re-anchorable.
