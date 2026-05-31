/**
 * Persisted snapshot of "who the user is" — identity (`/auth/me`) + active
 * workspace (`/workspaces/current`). Lives in `chrome.storage.local` so the
 * popup, FAB, and any future extension surface render the user's real name
 * instantly on open instead of flashing a skeleton on every cold mount.
 *
 * Source of truth is still the API. This is a *cache*: stale-while-revalidate.
 * On open: show cached → refresh in the background → update cached. On
 * disconnect or 401: clear cached so the next open starts honest.
 */
import type { Me, Workspace } from "./api";
import { isExtensionAlive } from "./extension";

const CACHE_KEY = "pl_session_cache";

export interface SessionSnapshot {
  me: Me;
  workspace: Workspace;
  /** ISO timestamp — for debugging / future age-based eviction. */
  fetchedAt: string;
}

export async function getSessionCache(): Promise<SessionSnapshot | null> {
  if (!isExtensionAlive()) return null;
  try {
    const data = await chrome.storage.local.get(CACHE_KEY);
    const raw = data[CACHE_KEY] as SessionSnapshot | undefined;
    // Cheap shape check — old/partial cache entries should be ignored, not
    // crash the UI.
    if (!raw?.me?.id || !raw.workspace?.id) return null;
    return raw;
  } catch {
    return null;
  }
}

export async function setSessionCache(snapshot: {
  me: Me;
  workspace: Workspace;
}): Promise<void> {
  if (!isExtensionAlive()) return;
  try {
    await chrome.storage.local.set({
      [CACHE_KEY]: { ...snapshot, fetchedAt: new Date().toISOString() },
    });
  } catch {
    /* storage unavailable — fail silent, just lose the cache */
  }
}

export async function clearSessionCache(): Promise<void> {
  if (!isExtensionAlive()) return;
  try {
    await chrome.storage.local.remove(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
