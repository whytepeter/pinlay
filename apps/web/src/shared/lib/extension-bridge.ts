/**
 * Web → extension token handoff.
 *
 * The dashboard doesn't know the extension's ID, so instead of
 * `chrome.runtime.sendMessage(EXT_ID, …)` we post a window message that the
 * extension's content script (which runs on the dashboard origin) picks up and
 * relays to its background worker. The content script ACKs with a matching
 * window message so we can show connected / not-installed states.
 */

export interface ExtensionConnectResult {
  ok: boolean;
  /** present when the extension responded */
  version?: string;
  /** set when no extension answered within the timeout */
  notInstalled?: boolean;
  error?: string;
}

const REQ = "pinlay:web-connect-extension";
const ACK = "pinlay:extension-connected";

/**
 * Push the session token + user identity to the extension. Resolves with
 * `notInstalled: true` if nothing ACKs within `timeoutMs` (extension absent).
 */
export function connectExtension(
  payload: { token: string; userId: string; orgId: string },
  timeoutMs = 1500,
): Promise<ExtensionConnectResult> {
  return new Promise((resolve) => {
    let settled = false;

    function onAck(e: MessageEvent) {
      if (e.source !== window) return;
      const data = e.data as { type?: string; ok?: boolean; version?: string; error?: string };
      if (data?.type !== ACK) return;
      settled = true;
      window.removeEventListener("message", onAck);
      resolve({ ok: !!data.ok, version: data.version, error: data.error });
    }

    window.addEventListener("message", onAck);
    window.postMessage({ type: REQ, ...payload }, window.location.origin);

    window.setTimeout(() => {
      if (settled) return;
      window.removeEventListener("message", onAck);
      resolve({ ok: false, notInstalled: true });
    }, timeoutMs);
  });
}
