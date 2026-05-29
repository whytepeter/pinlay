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
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === "START_ANNOTATION") {
        void (async () => {
          const { getAuth } = await import("../lib/auth");
          const auth = await getAuth();
          await startAnnotation(auth);
        })();
      }
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

    // ── Annotation overlay (on demand) ────────────────────────────────────────
    async function startAnnotation(auth: Awaited<ReturnType<typeof import("../lib/auth").getAuth>>) {
      // Both entry points (popup "Drop a pin" CTA and FAB idle "Drop a pin"
      // item) semantically mean "I want to place a pin right now", not "mount
      // the overlay and wait." Either drop the user straight into place mode
      // (overlay already up) or do so right after mount.
      const { useAnnotationState } = await import("../lib/annotation-state");
      const state = useAnnotationState();

      if (annotationUi) {
        state.requestPlace();
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
            onClose: () => {
              annotationUi?.remove();
              annotationUi = null;
            },
          });
          app.mount(container);
          return app;
        },
        onRemove(app) {
          app?.unmount();
        },
      });
      annotationUi.mount();

      // Overlay watchers are registered during the synchronous setup() that
      // ran inside app.mount() above, so the counter bump below will fire the
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
