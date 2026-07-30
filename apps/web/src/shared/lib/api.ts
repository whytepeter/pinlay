/**
 * Web API client.
 *
 * Thin fetch wrapper around the pinlay API. In dev the base is `/api`, which
 * Vite proxies to the API server; override with `VITE_API_URL` for a deployed
 * backend. The bearer token is held in a module variable kept in sync by
 * `useAuth` (via `setApiToken`) so this module has no circular dependency on
 * the auth composable.
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

let authToken: string | null = null;
/** Called by useAuth whenever the token changes. */
export function setApiToken(token: string | null): void {
  authToken = token;
}

export interface ApiError extends Error {
  status?: number;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  orgId: string;
  role: string;
}

/** Shape returned by POST /auth/login and /auth/signup. */
export interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string; avatarUrl: string | null };
  workspace: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    role: string;
  };
}

// ── Issue / pin read DTOs (mirror apps/api/src/issues/issue.serializers.ts) ──
import type { Severity, Status, PinType } from "@pinlay/shared";

export interface MemberRef {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface WorkspaceMember extends MemberRef {
  role: string;
}

/** Compact board chip embedded in IssueSummary / IssueDetail. */
export interface BoardRef {
  id: string;
  name: string;
  slug: string;
  color: string;
}

/** A workspace as the switcher / settings render it (mirrors WorkspaceDto). */
export interface Workspace {
  id: string;
  slug: string;
  name: string;
  plan: string;
  role: string;
  memberCount: number;
}

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

/** Pending workspace invite row. Mirrors apps/api InviteDto. */
export interface WorkspaceInviteRow {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  /** Opaque accept-by-link token. Compose the URL as `${origin}/invite/${token}`. */
  token: string;
  invitedBy: { id: string; name: string };
  invitedAt: string;
  expiresAt: string;
}

/** Public preview returned by GET /api/invites/:token. */
export interface PublicInvitePreview {
  workspace: { id: string; slug: string; name: string };
  email: string;
  role: string;
  invitedBy: { name: string };
  expiresAt: string;
  hasAccount: boolean;
}

/**
 * POST /workspaces/members/invite returns either a member (instant join when
 * the invitee already has an account) or a pending invite. Discriminated by
 * `kind`.
 */
export type InviteResult =
  | { kind: "member"; member: WorkspaceMemberRow }
  | { kind: "invite"; invite: WorkspaceInviteRow };

export interface SwitchWorkspaceResult {
  token: string;
  workspace: Workspace;
}

export interface UpdateWorkspaceInput {
  name?: string;
  plan?: string;
}

export interface CreateWorkspaceInput {
  name: string;
  /** Auto-derived from name if omitted. Lowercase alphanumerics + hyphens. */
  slug?: string;
}

export interface UpdateMeInput {
  name?: string;
  avatarUrl?: string | null;
}

export interface InviteMemberInput {
  email: string;
  role?: string;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface StatusCounts {
  open: number;
  in_progress: number;
  resolved: number;
}

/** The dashboard's primary unit: a titled collection of pins. */
export interface IssueSummary {
  id: string;
  number: number;
  reference: string;
  workspaceId: string;
  title: string;
  summary: string | null;
  pageUrl: string;
  status: Status;
  reporter: MemberRef | null;
  board: BoardRef | null;
  pinCount: number;
  severityCounts: SeverityCounts;
  statusCounts: StatusCounts;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAttachment {
  id: string;
  url: string;
  type: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

export interface ApiPin {
  id: string;
  issueId: string | null;
  index: number;
  comment: string;
  title: string;
  severity: Severity;
  type: PinType;
  status: Status;
  author: MemberRef | null;
  assignee: MemberRef | null;
  anchor: Record<string, unknown>;
  offsetX: number;
  offsetY: number;
  labels: string[];
  stale: boolean;
  attachments: ApiAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueDetail extends IssueSummary {
  pins: ApiPin[];
}

// ── Pin Inbox (pin-centric dashboard feed, 2026-07-10 rebuild) ─────────────

export interface InboxIssueRef {
  id: string;
  title: string;
  reference: string;
}

/** One inbox row: the pin + where it lives. */
export interface InboxPin extends ApiPin {
  pageUrl: string;
  issue: InboxIssueRef | null;
}

/** Sibling pin pill on the detail page. */
export interface SiblingPin {
  id: string;
  index: number;
  title: string;
  status: Status;
}

export interface InboxPinDetail extends InboxPin {
  siblings: SiblingPin[];
}

export interface SiteBucket {
  host: string;
  count: number;
}

export type InboxState = "open" | "resolved" | "all";

export interface ListInboxPinsParams {
  state?: InboxState;
  site?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

/** Single comment on a pin. Mirrors apps/api SerializedComment. */
export interface PinCommentRow {
  id: string;
  pinId: string;
  body: string;
  author: MemberRef;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) {
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      /* non-JSON error body — keep statusText */
    }
    const err = new Error(message) as ApiError;
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  login: (email: string, password: string) =>
    request<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (input: {
    email: string;
    name: string;
    password: string;
    workspaceName?: string;
  }) =>
    request<AuthResult>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: () => request<Me>("/auth/me"),

  updateMe: (dto: UpdateMeInput) =>
    request<Me>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),

  /**
   * Two-step avatar upload:
   *   1. avatarUploadUrl — presign the PUT.
   *   2. Client PUTs the blob directly (fetch, no auth header).
   *   3. updateMe({avatarUrl: publicUrl}) — persist.
   * The blob NEVER passes through the Nest API.
   */
  avatarUploadUrl: (input: {
    contentType: string;
    sizeBytes: number;
    filename?: string;
  }) =>
    request<{
      objectKey: string;
      uploadUrl: string;
      publicUrl: string;
      headers: Record<string, string>;
      method: "PUT";
      expiresAt: string;
    }>("/auth/me/avatar-upload-url", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  workspaceMembers: () =>
    request<WorkspaceMember[]>("/auth/workspace/members"),

  // ── Workspaces (switcher + settings) ─────────────────────────────────────
  workspaces: {
    list: () => request<Workspace[]>("/workspaces"),
    current: () => request<Workspace>("/workspaces/current"),
    create: (dto: CreateWorkspaceInput) =>
      request<SwitchWorkspaceResult>("/workspaces", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    update: (dto: UpdateWorkspaceInput) =>
      request<Workspace>("/workspaces/current", {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    remove: () =>
      request<void>("/workspaces/current", { method: "DELETE" }),
    switch: (id: string) =>
      request<SwitchWorkspaceResult>(`/workspaces/${id}/switch`, {
        method: "POST",
      }),
    members: () => request<WorkspaceMemberRow[]>("/workspaces/members"),
    invite: (dto: InviteMemberInput) =>
      request<InviteResult>("/workspaces/members/invite", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    updateMember: (id: string, dto: { role: string }) =>
      request<WorkspaceMemberRow>(`/workspaces/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    removeMember: (id: string) =>
      request<void>(`/workspaces/members/${id}`, { method: "DELETE" }),

    // Pending invites — admins can list / resend / revoke them.
    invites: () => request<WorkspaceInviteRow[]>("/workspaces/invites"),
    resendInvite: (id: string) =>
      request<WorkspaceInviteRow>(`/workspaces/invites/${id}/resend`, {
        method: "POST",
      }),
    revokeInvite: (id: string) =>
      request<void>(`/workspaces/invites/${id}`, { method: "DELETE" }),
  },

  // ── Public invite-by-token (accept page) ────────────────────────────────
  invites: {
    /** Preview an invite. Public — no auth required. */
    lookup: (token: string) =>
      request<PublicInvitePreview>(`/invites/${encodeURIComponent(token)}`),

    /** Authenticated accept (email of caller must match invite email). */
    accept: (token: string) =>
      request<SwitchWorkspaceResult>(
        `/invites/${encodeURIComponent(token)}/accept`,
        { method: "POST" },
      ),

    /** Public signup + accept flow for invitees who don't yet have an account. */
    acceptWithSignup: (
      token: string,
      input: { name: string; password: string },
    ) =>
      request<SwitchWorkspaceResult>(
        `/invites/${encodeURIComponent(token)}/accept-with-signup`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
  },

  // ── Issues — only the legacy-link resolver remains (SessionRedirect).
  // The pin-centric inbox replaced the issue-level dashboard surface
  // (2026-07-10); boards client methods went with it.
  issues: {
    get: (id: string) => request<IssueDetail>(`/issues/${id}`),
  },

  // ── Pin mutations (extension's write surface, reused by the dashboard) ──
  pins: {
    /** The Pin Inbox — the dashboard's primary feed (pin-centric). */
    inbox: (params: ListInboxPinsParams = {}) =>
      request<Paginated<InboxPin>>(
        `/pins${qs(params as Record<string, unknown>)}`,
      ),
    /** Distinct site hosts + counts for the site filter chips. */
    sites: () => request<SiteBucket[]>("/pins/sites"),
    /** Single pin + sibling pills for /p/:pinId. */
    get: (id: string) => request<InboxPinDetail>(`/pins/${id}`),

    update: (id: string, patch: UpdatePinInput) =>
      request<ApiPin>(`/annotation/pins/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    remove: (id: string) =>
      request<{ deleted: boolean }>(`/annotation/pins/${id}`, {
        method: "DELETE",
      }),

    // Threaded comments on a single pin.
    comments: {
      list: (pinId: string) =>
        request<PinCommentRow[]>(`/annotation/pins/${pinId}/comments`),
      create: (pinId: string, body: string) =>
        request<PinCommentRow>(`/annotation/pins/${pinId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body }),
        }),
      update: (pinId: string, commentId: string, body: string) =>
        request<PinCommentRow>(
          `/annotation/pins/${pinId}/comments/${commentId}`,
          { method: "PATCH", body: JSON.stringify({ body }) },
        ),
      remove: (pinId: string, commentId: string) =>
        request<void>(
          `/annotation/pins/${pinId}/comments/${commentId}`,
          { method: "DELETE" },
        ),
    },
  },

  /**
   * Product feedback about pinlay itself. Write-only — the API exposes no GET
   * (these are messages to the pinlay team, not workspace content).
   */
  feedback: {
    create: (input: CreateFeedbackInput) =>
      request<{ id: string; createdAt: string }>("/feedback", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },
};

export type FeedbackKind = "bug" | "idea" | "question" | "other";

export interface CreateFeedbackInput {
  message: string;
  kind?: FeedbackKind;
  /** Route the user was on, so a vague report is still actionable. */
  path?: string;
}

export interface UpdatePinInput {
  status?: Status;
  /** Member id to assign, or null to unassign. */
  assigneeId?: string | null;
  comment?: string;
  severity?: Severity;
  /** Wire-side field name is `issueType` on the API. */
  issueType?: PinType;
  labels?: string[];
}
