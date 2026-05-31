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

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListIssuesParams {
  status?: Status;
  pageUrl?: string;
  q?: string;
  limit?: number;
  offset?: number;
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

  workspaceMembers: () =>
    request<WorkspaceMember[]>("/auth/workspace/members"),

  // ── Issues (dashboard read surface) ──────────────────────────────────────
  issues: {
    list: (params: ListIssuesParams = {}) =>
      request<Paginated<IssueSummary>>(
        `/issues${qs(params as Record<string, unknown>)}`,
      ),
    get: (id: string) => request<IssueDetail>(`/issues/${id}`),
    pins: (id: string) => request<ApiPin[]>(`/issues/${id}/pins`),
  },
};
