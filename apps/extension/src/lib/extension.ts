/**
 * Extension runtime helpers.
 *
 * When the extension is reloaded (during dev) any content script that was
 * previously injected becomes orphaned. The `chrome.*` APIs throw
 * "Extension context invalidated" if you try to call them. We use the presence
 * of `chrome.runtime?.id` as a fast synchronous check before any such call.
 */
export function isExtensionAlive(): boolean {
  try {
    return typeof chrome !== "undefined" && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

/**
 * Send a runtime message, swallowing "Extension context invalidated" rejections.
 * Returns null if the extension was reloaded out from under us.
 */
export async function safeSendMessage<T = unknown>(
  msg: unknown,
): Promise<T | null> {
  if (!isExtensionAlive()) return null;
  try {
    return (await chrome.runtime.sendMessage(msg)) as T;
  } catch {
    return null;
  }
}
