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
  method: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  file?: {
    base64: string;
    contentType: string;
    filename: string;
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
    const { getAuth } = await import("../lib/auth");
    const auth = await getAuth();
    const headers: Record<string, string> = {};
    if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;

    let body: BodyInit | undefined;
    if (msg.file) {
      // Convert base64 → Blob, send as multipart so the Worker can stream.
      const binary = atob(msg.file.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: msg.file.contentType });
      const form = new FormData();
      form.append("file", blob, msg.file.filename);
      for (const [k, v] of Object.entries(msg.fields ?? {})) {
        form.append(k, v);
      }
      body = form;
    } else if (msg.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(msg.json);
    }

    const res = await fetch(`${API_URL}${msg.path}`, {
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
});
