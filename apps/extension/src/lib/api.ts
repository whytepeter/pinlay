/**
 * API client
 * ──────────
 * All requests are proxied through the background service worker via
 * chrome.runtime.sendMessage so calls leave with the extension's
 * chrome-extension:// origin (which the Worker's CORS allows). Content
 * scripts inherit the host page origin which the Worker rejects.
 *
 * Binary payloads go over as base64 strings — Blob/File AND ArrayBuffer
 * both arrive as `{}` on the SW side, so JSON-safe serialisation is the
 * only reliable transport for file uploads.
 */
import type { Severity, Status, PinType } from "@pinlay/shared";
import { isExtensionAlive } from "./extension";

export interface Me {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgId: string;
  role: string;
}

/** Active workspace (GET /workspaces/current). */
export interface Workspace {
  id: string;
  slug: string;
  name: string;
  plan: string;
  role: string;
  memberCount: number;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

/**
 * A pin row from the API (grouped annotation model). Each pin belongs to a
 * session and a grouping issue; the overlay renders these on the page.
 */
export interface AnnotationPinRow {
  id: string;
  sessionId: string;
  issueId: string | null;
  index: number;
  anchor: Record<string, unknown>;
  comment: string;
  severity: Severity;
  issueType: PinType;
  status: Status;
  /** Pin reporter — used to gate the Delete affordance (author/admin only). */
  authorId: string;
  assigneeId: string | null;
  labels: string[];
  /** URL the pin lives on. Always present from the API. Used by host-grouped
   *  browse views to show + navigate to the right page on click. */
  pageUrl: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status?: number; error: string };

/**
 * Error thrown by the API client. `status` is the HTTP status when the request
 * reached the server (e.g. 401 = not connected / token rejected); it's
 * undefined for transport failures (API down, offline, orphaned SW) — which is
 * how callers distinguish "you need to connect" from "the backend is
 * unreachable".
 */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function send<T>(msg: Record<string, unknown>): Promise<T> {
  if (!isExtensionAlive()) {
    throw new ApiError("Extension context invalidated — reload the page.");
  }
  const res = (await chrome.runtime.sendMessage({
    type: "API_FETCH",
    ...msg,
  })) as ApiResult<T> | undefined;
  if (!res) throw new ApiError("No response from background worker.");
  if (!res.ok) throw new ApiError(res.error, res.status);
  return res.data;
}

/** Encode an ArrayBuffer as base64 (chunked to avoid call-stack overflow). */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[],
    );
  }
  return btoa(binary);
}

export const api = {
  me: () => send<Me>({ path: "/auth/me", method: "GET" }),

  /** The caller's active workspace — real name + plan + role (not the cuid). */
  currentWorkspace: () =>
    send<Workspace>({ path: "/workspaces/current", method: "GET" }),

  /** Every workspace the caller belongs to — drives the switcher. */
  listWorkspaces: () =>
    send<Workspace[]>({ path: "/workspaces", method: "GET" }),

  /**
   * Switch active workspace. Server verifies membership + mints a NEW JWT
   * bound to the target ws; the client must replace its stored token.
   */
  switchWorkspace: (id: string) =>
    send<{ token: string; workspace: Workspace }>({
      path: `/workspaces/${id}/switch`,
      method: "POST",
    }),

  getWorkspaceMembers: () =>
    send<WorkspaceMember[]>({
      path: "/auth/workspace/members",
      method: "GET",
    }),

  // ── Live annotation (GROUPED: session → issue → pins) ────────────────────
  /**
   * Create a pin. Omit sessionId/issueId on the FIRST pin of a sitting — the
   * server lazily creates the session + grouping issue and returns their ids,
   * which the overlay then reuses for every subsequent pin.
   */
  createPin: (input: {
    sessionId?: string;
    issueId?: string;
    pageUrl: string;
    anchor: Record<string, unknown>;
    offsetX: number;
    offsetY: number;
    comment: string;
    severity: string;
    issueType: string;
    assigneeId?: string | null;
    labels?: string[];
  }) =>
    send<{ pin: AnnotationPinRow; sessionId: string; issueId: string }>({
      path: "/annotation/pins",
      method: "POST",
      json: input,
    }),

  /** Update a pin (status / comment / severity / anchor). */
  updatePin: (id: string, patch: Record<string, unknown>) =>
    send<AnnotationPinRow>({
      path: `/annotation/pins/${id}`,
      method: "PATCH",
      json: patch,
    }),

  /** Delete a pin. */
  deletePin: (id: string) =>
    send<{ deleted: boolean }>({
      path: `/annotation/pins/${id}`,
      method: "DELETE",
    }),

  /** All pins on a single page (URL-exact). Used by the overlay's re-render
   *  — pins are anchored to elements on a SPECIFIC page so this must stay
   *  exact, not host-grouped. */
  getPagePins: (pageUrl: string) =>
    send<AnnotationPinRow[]>({
      path: `/annotation/pins?pageUrl=${encodeURIComponent(pageUrl)}`,
      method: "GET",
    }),

  /** All pins across every path of a host (Roadmap 2.1 host grouping). Used
   *  by the browse views (popup pin sub-view + FAB pin list) so a user on
   *  glown.io/ can see pins from glown.io/search too. Each row includes its
   *  own pageUrl so the click handler can navigate to the right page. */
  getHostPins: (host: string) =>
    send<AnnotationPinRow[]>({
      path: `/annotation/pins?host=${encodeURIComponent(host)}`,
      method: "GET",
    }),

  /** Finalise a session: set the grouping issue's title (+ optional summary). */
  submitSession: (sessionId: string, title: string, summary?: string) =>
    send<{ submitted: boolean; issueId: string | null }>({
      path: `/annotation/sessions/${sessionId}/submit`,
      method: "POST",
      json: { title, ...(summary !== undefined && { summary }) },
    }),

  /**
   * Three-step attachment upload:
   *   1. POST /attachments/upload-url — get a presigned PUT URL.
   *   2. PUT the blob directly to that URL (R2 or our local /uploads endpoint).
   *   3. POST /attachments — persist the row pointing at publicUrl.
   *
   * Bytes never travel through the Nest API. Callers still receive the same
   * {id, url, filename, ...} shape as before so the fire-and-forget wiring
   * in AnnotationOverlay doesn't change.
   */
  uploadAttachment: async (params: {
    blob: Blob;
    filename: string;
    type: "screenshot" | "thumbnail" | "export";
    issueId?: string;
    pinId?: string;
  }): Promise<Attachment> => {
    const contentType = params.blob.type || "application/octet-stream";
    const sizeBytes = params.blob.size;

    // Step 1: presign.
    const presign = await send<{
      objectKey: string;
      uploadUrl: string;
      publicUrl: string;
      headers: Record<string, string>;
      method: "PUT";
      expiresAt: string;
    }>({
      path: "/attachments/upload-url",
      method: "POST",
      json: {
        type: params.type,
        contentType,
        sizeBytes,
        filename: params.filename,
        ...(params.issueId && { issueId: params.issueId }),
        ...(params.pinId && { pinId: params.pinId }),
      },
    });

    // Step 2: raw PUT to the presigned URL via the SW.
    const base64 = bufferToBase64(await params.blob.arrayBuffer());
    await send<unknown>({
      path: presign.uploadUrl,
      method: "PUT",
      directUrl: true,
      binary: { base64, contentType },
    });

    // Step 3: persist the DB row.
    return send<Attachment>({
      path: "/attachments",
      method: "POST",
      json: {
        type: params.type,
        objectKey: presign.objectKey,
        url: presign.publicUrl,
        contentType,
        filename: params.filename,
        sizeBytes,
        ...(params.issueId && { issueId: params.issueId }),
        ...(params.pinId && { pinId: params.pinId }),
      },
    });
  },
};

/** Convert a data URL into a Blob (used by clean-screenshot capture). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(b64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
