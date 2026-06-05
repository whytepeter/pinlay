/**
 * Content script — mounts the on-page surfaces:
 *
 *   1. FloatingLauncher   — permanent FAB (bottom-right by default, draggable).
 *                            Becomes the annotation toolbar when annotation
 *                            is active.
 *   2. AnnotationOverlay  — VIEW + PLACE modes for dropping/triaging pins.
 *                            Mounted on demand; unmounted on Done/Esc.
 *
 * Pinlay is annotation-only; no screenshot, no recording, no offscreen host.
 *
 * IMPORTANT: register chrome.runtime.onMessage BEFORE any awaits so we
 * never miss a message sent during async initialisation.
 */
import { createApp } from "vue";
import FloatingLauncher from "../components/launcher/FloatingLauncher.vue";
import AnnotationOverlay from "../components/annotation/AnnotationOverlay.vue";
import RegionSelector, {
  type RegionBounds,
} from "../components/capture/RegionSelector.vue";
import MarkupView from "../components/capture/markup/MarkupView.vue";
import "../assets/style.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  cssInjectionMode: "ui",

  async main(ctx) {
    let annotationUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let regionUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let markupUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

    // ── Listeners FIRST (before any awaits) ───────────────────────────────────
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === "START_ANNOTATION") {
        void (async () => {
          const { getAuth } = await import("../lib/auth");
          const auth = await getAuth();
          await startAnnotation(auth);
        })();
        return false;
      }
      if (msg?.type === "VIEW_PINS") {
        void (async () => {
          const { getAuth } = await import("../lib/auth");
          const auth = await getAuth();
          await mountOverlayPassive(auth);
        })();
        return false;
      }
      if (msg?.type === "HIDE_PINS") {
        unmountOverlay();
        return false;
      }
      // Popup → tab: jump to a specific pin (overlay assumed mounted via
      // VIEW_PINS in the same click). One tick so the overlay's watcher is
      // registered before the counter bump.
      if (msg?.type === "JUMP_TO_PIN" && typeof msg.id === "string") {
        void (async () => {
          await new Promise<void>((r) => setTimeout(r, 0));
          const { useAnnotationState } = await import("../lib/annotation-state");
          useAnnotationState().requestJump(msg.id);
        })();
        return false;
      }
      // Popup → tab: full pin-state snapshot for the popup's main + sub-view.
      // We REFETCH on demand so the popup always sees current data — the init
      // probe could be minutes stale by the time the user opens the popup.
      // Also writes back to state so the FAB picks up the fresh count.
      if (msg?.type === "GET_PAGE_PIN_STATE") {
        void (async () => {
          try {
            const { getAuth } = await import("../lib/auth");
            const auth = await getAuth();
            if (!auth?.token) {
              sendResponse({
                ok: true,
                viewablePinCount: 0,
                viewing: false,
                counts: { open: 0, resolved: 0, all: 0 },
                pins: [],
              });
              return;
            }
            const { api } = await import("../lib/api");
            // Host-grouped fetch (Roadmap 2.1) — the browse views show pins
            // across every path of this site so the user can navigate from
            // glown.io to a pin on glown.io/search. The on-page overlay
            // still uses URL-exact fetch in its own apiProbe.
            const fetched = await api.getHostPins(location.host);
            // Pins on the CURRENT path float to the top — popup/FAB lists
            // mirror the user's immediate context. Stable sort preserves
            // the server's sessionId/index order within each group.
            const raw = sortCurrentFirst(fetched);
            const { useAnnotationState } = await import("../lib/annotation-state");
            const state = useAnnotationState();
            state.setViewablePinCount(raw.length);
            state.setPinRows(raw.map((p, i) => formatProbedPinRow(p, i + 1)));
            sendResponse({
              ok: true,
              viewablePinCount: raw.length,
              viewing: state.viewing.value,
              counts: countByStatus(raw),
              pins: raw.map((p, i) => formatPopupPinRow(p, i + 1)),
            });
          } catch {
            sendResponse({ ok: false });
          }
        })();
        return true; // async
      }
      return false;
    });

    window.addEventListener("pinlay:start-annotation", async () => {
      try {
        const { getAuth } = await import("../lib/auth");
        const auth = await getAuth();
        await startAnnotation(auth);
      } catch {
        // Orphaned content script (extension reloaded)
      }
    });

    // FAB "View pins" in the pin-list sub-view → mount overlay AND jump to
    // a specific pin. Single event so the launcher doesn't have to sequence
    // mount + requestJump itself (the overlay's `jumpRequested` watcher only
    // exists after the overlay's setup runs).
    window.addEventListener("pinlay:view-pin-then-jump", async (e) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      try {
        const { getAuth } = await import("../lib/auth");
        const auth = await getAuth();
        await mountOverlayPassive(auth);
        // Yield one microtask so the overlay's watchers are registered
        // before the counter bump that triggers them.
        await new Promise<void>((r) => setTimeout(r, 0));
        const { useAnnotationState } = await import("../lib/annotation-state");
        useAnnotationState().requestJump(detail.id);
      } catch {
        /* orphaned content script */
      }
    });

    // ── Web → extension token handoff ─────────────────────────────────────────
    // The dashboard's /connect-extension page posts the session token here
    // (window.postMessage, same-origin). We relay it to the background worker
    // for storage, then ACK so the page can show "connected". Only messages
    // from THIS window + our own origin are honoured.
    window.addEventListener("message", (e: MessageEvent) => {
      if (e.source !== window) return;
      const data = e.data as {
        type?: string;
        token?: string;
        userId?: string;
        orgId?: string;
      };
      if (data?.type !== "pinlay:web-connect-extension") return;
      if (typeof data.token !== "string" || !data.token) return;

      void (async () => {
        let result: { ok: boolean; version?: string; error?: string };
        try {
          const { setAuth } = await import("../lib/auth");
          await setAuth({
            token: data.token!,
            orgId: data.orgId ?? "",
            userId: data.userId,
          });
          result = {
            ok: true,
            version: chrome.runtime.getManifest().version,
          };
        } catch (err) {
          result = { ok: false, error: (err as Error).message };
        }
        window.postMessage(
          { type: "pinlay:extension-connected", ...result },
          window.location.origin,
        );
      })();
    });

    // Composer → content-script: enter region-capture mode. Mounts the
    // RegionSelector shadow UI; on selection we crop and dispatch the dataUrl
    // back via `pinlay:capture-region-result` so the composer can attach it.
    window.addEventListener("pinlay:capture-region", () => {
      void startRegionCapture();
    });

    // ── FloatingLauncher (permanent) ──────────────────────────────────────────
    const launcherUi = await createShadowRootUi(ctx, {
      name: "pinlay-launcher",
      position: "inline",
      anchor: "body",
      onMount(container) {
        const app = createApp(FloatingLauncher);
        app.mount(container);
        return app;
      },
      onRemove(app) {
        app?.unmount();
      },
    });
    launcherUi.mount();
    // Host: fixed to viewport, pointer-events:none so it never blocks the page;
    // FAB inner re-enables pointer events.
    {
      const host = document.querySelector("pinlay-launcher") as HTMLElement | null;
      if (host) {
        host.style.position = "fixed";
        host.style.bottom = "0";
        host.style.right = "0";
        host.style.zIndex = "2147483647";
        host.style.pointerEvents = "none";
      }
    }

    // ── Annotation overlay ────────────────────────────────────────────────────
    // Two entry points:
    //   • mountOverlayPassive(auth)  — Roadmap 2.1 developer overlay. Mounts
    //     the overlay on page load so existing pins for this URL render LIVE
    //     on their anchored elements, without the user clicking "Drop a pin".
    //     The overlay stays in view mode — no crosshair, no place capture
    //     layer, FAB stays idle. Cheap when there are no pins (the overlay
    //     renders nothing).
    //   • startAnnotation(auth)      — popup CTA / FAB "Drop a pin" / Cmd+⇧+P.
    //     Ensures the overlay is mounted, then fires `requestPlace()` to
    //     enter PLACE mode (which is what flips the FAB into annotation
    //     controls).
    async function mountOverlayPassive(
      auth: Awaited<ReturnType<typeof import("../lib/auth").getAuth>>,
    ) {
      const { useAnnotationState } = await import("../lib/annotation-state");
      const state = useAnnotationState();
      if (annotationUi) {
        state.setViewing(true);
        return;
      }
      const meta = collectBrowserMetaFromPage();
      annotationUi = await createShadowRootUi(ctx, {
        name: "pinlay-annotation",
        position: "modal",
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          // One below the launcher so the FAB-as-toolbar stays clickable.
          host.style.zIndex = "2147483646";
          // Host is inert; pins/composer/capture layer opt back in with
          // pointer-events:auto.
          host.style.pointerEvents = "none";
          const app = createApp(AnnotationOverlay, {
            browserMeta: meta,
            auth,
          });
          app.mount(container);
          return app;
        },
        onRemove(app) {
          app?.unmount();
        },
      });
      annotationUi.mount();
      state.setViewing(true);
    }

    function unmountOverlay() {
      annotationUi?.remove();
      annotationUi = null;
      // Fire-and-forget state update (state import is dynamic so this is async).
      void import("../lib/annotation-state").then(({ useAnnotationState }) => {
        useAnnotationState().setViewing(false);
      });
    }

    async function startAnnotation(
      auth: Awaited<ReturnType<typeof import("../lib/auth").getAuth>>,
    ) {
      const { useAnnotationState } = await import("../lib/annotation-state");
      const state = useAnnotationState();
      await mountOverlayPassive(auth);
      // Overlay watchers are registered during the synchronous setup() that
      // ran inside app.mount(), so this counter bump fires the
      // `placeRequested` watcher on the next reactive flush.
      state.requestPlace();
    }

    // ── Region capture ────────────────────────────────────────────────────────
    function dispatchRegionResult(detail: { dataUrl?: string; cancelled?: boolean }) {
      window.dispatchEvent(
        new CustomEvent("pinlay:capture-region-result", { detail }),
      );
    }

    async function startRegionCapture() {
      if (regionUi) return; // already up
      regionUi = await createShadowRootUi(ctx, {
        name: "pinlay-region",
        position: "modal",
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          host.style.zIndex = "2147483647";
          // We want the host CLICKABLE — the selector captures mouse drags —
          // so don't disable pointer-events here.
          const app = createApp(RegionSelector, {
            onSelected: (bounds: RegionBounds) => {
              void finishRegionCapture(bounds);
            },
            onCancel: () => {
              unmountRegion();
              dispatchRegionResult({ cancelled: true });
            },
          });
          app.mount(container);
          return app;
        },
        onRemove(app) {
          app?.unmount();
        },
      });
      regionUi.mount();
    }

    function unmountRegion() {
      regionUi?.remove();
      regionUi = null;
    }

    async function finishRegionCapture(bounds: RegionBounds) {
      // 1. Hide ALL pinlay UI so the captureVisibleTab frame is clean —
      //    selector, annotation overlay (composer + pin markers), launcher.
      const hosts = ["pinlay-region", "pinlay-annotation", "pinlay-launcher"]
        .map((s) => document.querySelector(s) as HTMLElement | null)
        .filter((h): h is HTMLElement => !!h);
      const prevDisplay = hosts.map((h) => h.style.display);
      hosts.forEach((h) => {
        h.style.display = "none";
      });

      // 2. Two rAFs so the browser paints the hidden state before capture.
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );

      // 3. Capture.
      let dataUrl: string | null = null;
      try {
        const res = (await chrome.runtime.sendMessage({
          type: "CAPTURE_VISIBLE_TAB",
        })) as { ok: boolean; dataUrl?: string; error?: string } | null;
        if (res?.ok && res.dataUrl) dataUrl = res.dataUrl;
      } catch {
        /* swallow — handled by null dataUrl below */
      }

      // 4. Restore display BEFORE we unmount the selector, then unmount.
      hosts.forEach((h, i) => {
        h.style.display = prevDisplay[i] ?? "";
      });
      unmountRegion();

      if (!dataUrl) {
        dispatchRegionResult({ cancelled: true });
        return;
      }

      // 5. Crop the visible-tab frame to the selected bounds. Account for DPR
      //    so high-DPI captures don't double-scale.
      let cropped: string;
      try {
        cropped = await cropImage(dataUrl, bounds);
      } catch {
        dispatchRegionResult({ cancelled: true });
        return;
      }

      // 6. Hand the cropped image to the markup editor. Attach → dispatch
      //    the annotated PNG back to the composer. Cancel → drop.
      await mountMarkup(cropped);
    }

    async function mountMarkup(screenshotDataUrl: string) {
      if (markupUi) {
        markupUi.remove();
        markupUi = null;
      }
      markupUi = await createShadowRootUi(ctx, {
        name: "pinlay-markup",
        position: "modal",
        onMount(container) {
          const host = (container.getRootNode() as ShadowRoot).host as HTMLElement;
          host.style.zIndex = "2147483647";
          const app = createApp(MarkupView, {
            screenshotDataUrl,
            onAttach: (annotated: string) => {
              unmountMarkup();
              dispatchRegionResult({ dataUrl: annotated });
            },
            onCancel: () => {
              unmountMarkup();
              dispatchRegionResult({ cancelled: true });
            },
          });
          app.mount(container);
          return app;
        },
        onRemove(app) {
          app?.unmount();
        },
      });
      markupUi.mount();
    }

    function unmountMarkup() {
      markupUi?.remove();
      markupUi = null;
    }

    async function cropImage(dataUrl: string, bounds: RegionBounds): Promise<string> {
      const dpr = window.devicePixelRatio || 1;
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const x = Math.round(bounds.x * dpr);
      const y = Math.round(bounds.y * dpr);
      const w = Math.round(bounds.w * dpr);
      const h = Math.round(bounds.h * dpr);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) throw new Error("2d context unavailable");
      ctx2d.drawImage(img, x, y, w, h, 0, 0, w, h);
      return canvas.toDataURL("image/png");
    }

    // ── Probe page pins on init (Roadmap 2.1, opt-in view model) ─────────────
    // Pins are HIDDEN by default. We only PROBE the API on page load so the
    // FAB + popup can show a "View pins (N)" affordance when this URL has
    // pins to show. The overlay itself is NOT mounted until the user clicks
    // View pins (or Drop a pin).
    //
    // The probe ALSO populates `state.pinRows` so the FAB's in-menu pin
    // browser (View pins → list) can render without the overlay being
    // mounted. Live signals (`stale`, `health`) require DOM resolution and
    // get filled in later by the overlay; we default to "ok" here.
    void (async () => {
      try {
        const { getAuth } = await import("../lib/auth");
        const auth = await getAuth();
        if (!auth?.token) return;
        const { api } = await import("../lib/api");
        // Host-grouped (Roadmap 2.1): the FAB count + list show every pin on
        // this site, not just this exact URL, so the user can navigate from
        // / to /search etc.
        const fetched = await api.getHostPins(location.host);
        // Same sort as the GET_PAGE_PIN_STATE path — pins on the current
        // URL appear first so the FAB list matches the user's context.
        const pins = sortCurrentFirst(fetched);
        const { useAnnotationState } = await import("../lib/annotation-state");
        const state = useAnnotationState();
        state.setViewablePinCount(pins.length);
        state.setPinRows(pins.map((p, i) => formatProbedPinRow(p, i + 1)));
      } catch {
        // Network/orphan/401 — leave the count at 0, button just stays hidden.
      }
    })();

    // ── Hash deep-link: #pinlay-pin=<id> (Roadmap 2.2) ───────────────────────
    // A pin row clicked in the popup/FAB for a DIFFERENT URL than the current
    // tab navigates here with the pin id in the hash. We mount the overlay
    // and jump to the pin on page-load — single seam for cross-URL
    // navigation. Hash is consumed (history.replaceState) so it doesn't
    // stick around in the URL bar.
    void (async () => {
      const m = location.hash.match(/pinlay-pin=([\w-]+)/);
      if (!m) return;
      const pinId = m[1];
      // Clean the hash before any handlers run so we don't loop on
      // history events.
      try {
        history.replaceState(
          null,
          "",
          location.pathname + location.search,
        );
      } catch {
        /* ignore */
      }
      try {
        const { getAuth } = await import("../lib/auth");
        const auth = await getAuth();
        if (!auth?.token) return;
        await mountOverlayPassive(auth);
        // Two ticks so the overlay's apiProbe + watcher setup completes
        // before we bump the jump counter.
        await new Promise<void>((r) => setTimeout(r, 250));
        const { useAnnotationState } = await import("../lib/annotation-state");
        useAnnotationState().requestJump(pinId);
      } catch {
        /* orphaned */
      }
    })();

    // Format an API pin into the popup's richer pin-list row (sub-view).
    // Splits the comment into title (first line) + description (rest) for the
    // popup's two-line row layout. `pageUrl` is carried through so the popup
    // can show the path + navigate cross-URL on click (Roadmap 2.1 host
    // grouping). Author/reporter is omitted — the /annotation/pins endpoint
    // doesn't ship that field; crossing over to /issues would reshape the
    // data path. Easy to add later.
    function formatPopupPinRow(
      pin: {
        id: string;
        comment?: string | null;
        status?: string | null;
        severity?: string | null;
        pageUrl?: string | null;
        createdAt?: string;
      },
      index: number,
    ) {
      const comment = (pin.comment ?? "").trim();
      const nl = comment.indexOf("\n");
      const title = (nl === -1 ? comment : comment.slice(0, nl)).trim();
      const description = nl === -1 ? "" : comment.slice(nl + 1).trim();
      const status = pin.status ?? "open";
      return {
        id: pin.id,
        index,
        title: title || "Untitled pin",
        description,
        status,
        severity: pin.severity ?? "medium",
        pageUrl: pin.pageUrl ?? "",
        createdAt: pin.createdAt ?? "",
        resolved: status === "resolved",
      };
    }

    // Stable-sort pins on the current path to the top of the host-grouped
    // list. Matches by pathname only — query/hash are ignored so /search and
    // /search?q=x are treated as the same "context".
    function sortCurrentFirst<T extends { pageUrl?: string | null }>(rows: T[]): T[] {
      const here = location.pathname;
      return [...rows].sort((a, b) => {
        const aHere = sameAsCurrentPath(a.pageUrl);
        const bHere = sameAsCurrentPath(b.pageUrl);
        if (aHere && !bHere) return -1;
        if (!aHere && bHere) return 1;
        return 0;
      });
      function sameAsCurrentPath(url: string | null | undefined): boolean {
        if (!url) return false;
        try {
          return new URL(url).pathname === here;
        } catch {
          return false;
        }
      }
    }

    // Status → (open / resolved / all). Counts "in_progress" as open (it's
    // not the resolved state and the user thinks of it as "still in flight").
    function countByStatus(pins: { status?: string | null }[]) {
      let open = 0;
      let resolved = 0;
      for (const p of pins) {
        if (p.status === "resolved") resolved++;
        else open++;
      }
      return { open, resolved, all: pins.length };
    }

    // Format an API pin into the launcher's PinListRow shape. Mirrors the
    // overlay's row builder (severity/status dot maps) but without the
    // health/stale signals that need a mounted DOM resolver. `pageUrl` rides
    // along so the FAB list can show the path + navigate on click.
    function formatProbedPinRow(
      pin: {
        id: string;
        comment?: string | null;
        status?: string | null;
        severity?: string | null;
        pageUrl?: string | null;
      },
      index: number,
    ) {
      const STATUS_DOT: Record<string, string> = {
        open: "bg-status-open",
        in_progress: "bg-status-progress",
        resolved: "bg-status-resolved",
        draft: "bg-muted",
        archived: "bg-muted",
      };
      const SEV_DOT: Record<string, string> = {
        low: "bg-sev-low",
        medium: "bg-sev-medium",
        high: "bg-sev-high",
        critical: "bg-sev-critical",
      };
      const title = (pin.comment ?? "").split("\n")[0].trim();
      const status = pin.status ?? "";
      const sev = pin.severity ?? "";
      return {
        id: pin.id,
        index,
        title: title || "Untitled pin",
        statusLabel: status ? status.replace(/_/g, " ") : "draft",
        dotBg: status
          ? (STATUS_DOT[status] ?? "bg-muted")
          : (SEV_DOT[sev] ?? "bg-muted"),
        stale: false,
        health: "ok" as const,
        pageUrl: pin.pageUrl ?? "",
      };
    }

    // Browser metadata collected from the content-script side.
    function collectBrowserMetaFromPage() {
      return {
        pageUrl: location.href,
        pageTitle: document.title,
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio || 1,
      };
    }
  },
});
