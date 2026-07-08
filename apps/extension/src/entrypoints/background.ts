/**
 * Background service worker.
 *
 * Owns:
 *   • API proxy — content scripts inherit the host page origin which the
 *     Worker's CORS rejects; we forward through `API_FETCH` so requests
 *     leave with the chrome-extension:// origin instead.
 *   • Message bridge — popup / dashboard / content script trade signals here.
 *   • Auth storage — tokens live in chrome.storage.local; this SW just routes.
 *
 * No recording, no tabCapture, no offscreen host — pinlay is annotation-only.
 */
import { API_URL } from "../lib/env";

interface ApiFetchMsg {
  type: "API_FETCH";
  path: string;
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  json?: unknown;
  /**
   * Raw-body PUT (used for direct uploads to presigned URLs). `path` must be
   * a fully-qualified URL when `directUrl` is true — the API_URL prefix is
   * not applied and the auth header is NOT included (the presigned URL is
   * its own credential).
   */
  directUrl?: boolean;
  binary?: {
    base64: string;
    contentType: string;
  };
  fields?: Record<string, string>;
}

interface ApiResult<T> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
}

async function apiFetch(msg: ApiFetchMsg): Promise<ApiResult<unknown>> {
  try {
    const headers: Record<string, string> = {};
    if (!msg.directUrl) {
      const { getAuth } = await import("../lib/auth");
      const auth = await getAuth();
      if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
    }

    let body: BodyInit | undefined;
    if (msg.binary) {
      // base64 → Blob and PUT raw. Used for presigned uploads (R2 or local).
      const binary = atob(msg.binary.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      body = new Blob([bytes], { type: msg.binary.contentType });
      headers["Content-Type"] = msg.binary.contentType;
    } else if (msg.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(msg.json);
    }

    const url = msg.directUrl ? msg.path : `${API_URL}${msg.path}`;
    const res = await fetch(url, {
      method: msg.method,
      headers,
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text || res.statusText };
    }

    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    console.log("[pinlay] installed:", details.reason);
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    // Popup → background: forward "start annotation" to the active tab.
    if (msg?.type === "start-annotation" || msg?.type === "START_ANNOTATION") {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id != null) {
          chrome.tabs.sendMessage(tab.id, { type: "START_ANNOTATION" });
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: "no active tab" });
        }
      });
      return true; // async
    }

    // Content / popup → background: open a tab.
    if (msg?.type === "OPEN_TAB" && typeof msg.url === "string") {
      chrome.tabs.create({ url: msg.url });
      sendResponse({ ok: true });
      return false;
    }

    // Content → background: capture the visible tab as a PNG dataUrl.
    // Used by the annotation composer's "Attach screenshot" button so the
    // user can pin a screenshot of the page they're annotating.
    if (msg?.type === "CAPTURE_VISIBLE_TAB") {
      chrome.tabs.captureVisibleTab({ format: "png" }, (dataUrl) => {
        const err = chrome.runtime.lastError;
        if (err || !dataUrl) {
          sendResponse({ ok: false, error: err?.message ?? "capture failed" });
        } else {
          sendResponse({ ok: true, dataUrl });
        }
      });
      return true; // async
    }

    // Content → background: proxy API call.
    if (msg?.type === "API_FETCH") {
      apiFetch(msg as ApiFetchMsg).then((res) => {
        sendResponse(res);
      });
      return true; // async
    }

    return false;
  });

  // Dashboard → extension (externally_connectable) ping for handshake.
  chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "ping") {
      sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    }
    return false;
  });

  // Roadmap 4.1: keyboard-driven pin drop. Reuses the same START_ANNOTATION
  // path as the popup CTA + FAB menu — content.ts mounts the overlay then
  // jumps straight to PLACE mode. Escape inside the overlay already cascades
  // (cancel composer → close detail → exit place → exit annotation).
  if (chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
      if (command !== "drop-pin") return;
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id != null) {
          chrome.tabs.sendMessage(tab.id, { type: "START_ANNOTATION" });
        }
      });
    });
  }
});
