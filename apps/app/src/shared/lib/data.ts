import type {
  Anchor,
  Pin,
  PinType,
  Session,
  Severity,
  Status,
  SyncState,
  User,
} from "@pinlayer/shared";

/**
 * Mock-first seed data so the dashboard is fully buildable before the API
 * exists. Swap the source behind the composables, not in the components.
 */

const ORG = "org_acme";

export const PEOPLE: User[] = [
  { id: "u_bright", orgId: ORG, email: "bright@nlockd.com", name: "Bright Eze", avatarHue: 262 },
  { id: "u_mara", orgId: ORG, email: "mara@acme.com", name: "Mara Vidal", avatarHue: 200 },
  { id: "u_theo", orgId: ORG, email: "theo@acme.com", name: "Theo Park", avatarHue: 330 },
  { id: "u_lena", orgId: ORG, email: "lena@acme.com", name: "Lena Fox", avatarHue: 140 },
  { id: "u_sam", orgId: ORG, email: "sam@acme.com", name: "Sam Roe", avatarHue: 30 },
];

export function personById(id: string): User {
  return PEOPLE.find((p) => p.id === id) ?? PEOPLE[0]!;
}

export interface SessionListItem extends Session {
  integration?: { name: string; count: number; state: SyncState };
}

const min = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const SESSIONS: SessionListItem[] = [
  {
    id: "s_1",
    orgId: ORG,
    shortId: "PL-0142",
    title: "Checkout button misaligned on mobile + coupon field overflows",
    pageUrl: "https://app.acme.com/checkout",
    urlPath: "/checkout",
    faviconLabel: "AC",
    faviconHue: 262,
    reporterId: "u_bright",
    status: "open",
    pinCount: 8,
    severityCounts: { critical: 2, high: 3, medium: 2, low: 1 },
    createdAt: min(180),
    updatedAt: min(12),
    integration: { name: "Linear", count: 6, state: "ok" },
  },
  {
    id: "s_2",
    orgId: ORG,
    shortId: "PL-0141",
    title: "Pricing page — plan cards inconsistent spacing across breakpoints",
    pageUrl: "https://acme.com/pricing",
    urlPath: "/pricing",
    faviconLabel: "AC",
    faviconHue: 200,
    reporterId: "u_mara",
    status: "in_progress",
    pinCount: 5,
    severityCounts: { critical: 0, high: 2, medium: 2, low: 1 },
    createdAt: min(600),
    updatedAt: min(48),
    integration: { name: "Jira", count: 3, state: "pending" },
  },
  {
    id: "s_3",
    orgId: ORG,
    shortId: "PL-0139",
    title: "Dashboard empty states missing copy and CTA",
    pageUrl: "https://app.acme.com/dashboard",
    urlPath: "/dashboard",
    faviconLabel: "AC",
    faviconHue: 330,
    reporterId: "u_theo",
    status: "open",
    pinCount: 3,
    severityCounts: { critical: 0, high: 1, medium: 1, low: 1 },
    createdAt: min(1500),
    updatedAt: min(160),
    integration: { name: "GitHub", count: 1, state: "failed" },
  },
  {
    id: "s_4",
    orgId: ORG,
    shortId: "PL-0136",
    title: "Marketing hero — contrast fails AA on gradient background",
    pageUrl: "https://acme.com/",
    urlPath: "/",
    faviconLabel: "AC",
    faviconHue: 140,
    reporterId: "u_lena",
    status: "resolved",
    pinCount: 4,
    severityCounts: { critical: 0, high: 0, medium: 2, low: 2 },
    createdAt: min(4000),
    updatedAt: min(1440),
    integration: { name: "Linear", count: 4, state: "ok" },
  },
  {
    id: "s_5",
    orgId: ORG,
    shortId: "PL-0134",
    title: "Settings → billing modal traps focus and can't be dismissed",
    pageUrl: "https://app.acme.com/settings/billing",
    urlPath: "/settings/billing",
    faviconLabel: "AC",
    faviconHue: 30,
    reporterId: "u_sam",
    status: "in_progress",
    pinCount: 6,
    severityCounts: { critical: 1, high: 2, medium: 2, low: 1 },
    createdAt: min(2600),
    updatedAt: min(310),
    integration: { name: "Linear", count: 5, state: "ok" },
  },
  {
    id: "s_6",
    orgId: ORG,
    shortId: "PL-0131",
    title: "Docs sidebar scroll jumps when expanding a section",
    pageUrl: "https://docs.acme.com/guides",
    urlPath: "/guides",
    faviconLabel: "DX",
    faviconHue: 262,
    reporterId: "u_mara",
    status: "open",
    pinCount: 2,
    severityCounts: { critical: 0, high: 0, medium: 1, low: 1 },
    createdAt: min(5200),
    updatedAt: min(2880),
  },
];

export function statusCounts() {
  return {
    all: SESSIONS.length,
    open: SESSIONS.filter((s) => s.status === "open").length,
    in_progress: SESSIONS.filter((s) => s.status === "in_progress").length,
    resolved: SESSIONS.filter((s) => s.status === "resolved").length,
  };
}

/* ─── Pins (issue detail) ─────────────────────────────────────────────── */

export type PinItem = Pin;

const PIN_TITLES = [
  "Primary CTA overlaps the coupon field on small widths",
  "Touch target is below the 44px minimum",
  "Heading hierarchy skips from h2 to h4",
  "Muted helper text contrast is only 2.9:1",
  "Product image is missing alt text",
  "Layout shift when the web font loads",
  "Focus ring not visible on the icon button",
  "Label truncates at 320px viewport",
  "Icon-only button has no accessible name",
  "Spinner never resolves on slow connections",
  "Duplicate id attributes inside the form",
  "Background scrolls behind the open modal",
];

const PIN_BODIES = [
  "Reproduces consistently below ~400px. The actions row needs a min-width or wrap.",
  "Tap area measures 32×32; bump padding so it clears 44×44.",
  "Screen readers announce the wrong outline. Use an h3 here.",
  "Fails WCAG AA for body text. Darken to at least 4.5:1.",
  "Decorative? If not, add a descriptive alt.",
  "CLS ~0.18 — reserve space or preload the font.",
];

function sampleAnchor(urlPath: string, i: number): Anchor {
  return {
    selector: `main > section:nth-child(2) .actions button:nth-child(${i})`,
    xpath: `/html/body/main/section[2]/div[3]/button[${i}]`,
    tag: "button",
    role: "button",
    accessibleName: "Place order",
    textFingerprint: "Place order",
    boundingBox: { x: 420, y: 868, width: 184, height: 44 },
    viewportSize: { width: 1440, height: 900 },
    devicePixelRatio: 2,
    scrollPosition: { x: 0, y: 640 },
    urlPath,
  };
}

const PIN_STATUSES: Status[] = ["open", "open", "in_progress", "resolved"];
const PIN_TYPES: PinType[] = [
  "visual",
  "a11y",
  "layout",
  "copy",
  "broken",
  "perf",
  "missing",
  "other",
];

export function getPins(sessionId: string): PinItem[] {
  const s = SESSIONS.find((x) => x.id === sessionId);
  if (!s) return [];
  const order: Severity[] = ["critical", "high", "medium", "low"];
  const sevs: Severity[] = [];
  for (const k of order) {
    for (let i = 0; i < s.severityCounts[k]; i++) sevs.push(k);
  }
  return sevs.map((severity, i) => ({
    id: `${sessionId}-p${i + 1}`,
    sessionId,
    index: i + 1,
    title: PIN_TITLES[i % PIN_TITLES.length]!,
    body: PIN_BODIES[i % PIN_BODIES.length]!,
    severity,
    type: PIN_TYPES[i % PIN_TYPES.length]!,
    status: PIN_STATUSES[i % PIN_STATUSES.length]!,
    assigneeId: PEOPLE[(i + 1) % PEOPLE.length]!.id,
    anchor: sampleAnchor(s.urlPath, i + 1),
    offsetX: 0,
    offsetY: 0,
    stale: i % 5 === 2,
    createdById: s.reporterId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/* ─── Activity (per pin) ──────────────────────────────────────────────── */

export interface ActivityFeedItem {
  id: string;
  kind: "pinned" | "comment" | "status" | "sync" | "assign";
  actorId: string;
  body?: string;
  meta?: string;
  createdAt: string;
}

export function getActivity(pin: PinItem): ActivityFeedItem[] {
  const assignee = pin.assigneeId ?? PEOPLE[0]!.id;
  return [
    {
      id: `${pin.id}-a1`,
      kind: "pinned",
      actorId: pin.createdById,
      createdAt: pin.createdAt,
    },
    {
      id: `${pin.id}-a2`,
      kind: "comment",
      actorId: PEOPLE[1]!.id,
      body: "Confirmed on iPhone 13 / Safari — the coupon field grows past the button under ~400px.",
      createdAt: pin.createdAt,
    },
    {
      id: `${pin.id}-a3`,
      kind: "assign",
      actorId: pin.createdById,
      meta: personById(assignee).name,
      createdAt: pin.updatedAt,
    },
    {
      id: `${pin.id}-a4`,
      kind: "sync",
      actorId: pin.createdById,
      meta: "Linear",
      createdAt: pin.updatedAt,
    },
    {
      id: `${pin.id}-a5`,
      kind: "comment",
      actorId: assignee,
      body: "Picked this up — shipping a fix that sets a min-width on the actions row.",
      createdAt: pin.updatedAt,
    },
  ];
}
