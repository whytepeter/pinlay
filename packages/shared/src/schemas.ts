import { z } from "zod";
import {
  IntegrationKind,
  PinType,
  Role,
  Severity,
  Status,
  SyncState,
} from "./enums";

export const SeverityCounts = z.object({
  critical: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
});
export type SeverityCounts = z.infer<typeof SeverityCounts>;

export const Org = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: z.string(),
  createdAt: z.string(),
});
export type Org = z.infer<typeof Org>;

export const User = z.object({
  id: z.string(),
  orgId: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarHue: z.number(),
});
export type User = z.infer<typeof User>;

export const Membership = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  role: Role,
});
export type Membership = z.infer<typeof Membership>;

export const Pinboard = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  hue: z.number(),
  urlPattern: z.string().optional(),
  defaultIntegrationId: z.string().optional(),
  createdAt: z.string(),
});
export type Pinboard = z.infer<typeof Pinboard>;

const Size = z.object({ width: z.number(), height: z.number() });
const Point = z.object({ x: z.number(), y: z.number() });

export const BoundingBox = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

/** Embedded jsonb on a pin; validated client-side at capture time. */
export const Anchor = z.object({
  selector: z.string(),
  xpath: z.string(),
  tag: z.string(),
  role: z.string().optional(),
  accessibleName: z.string().optional(),
  textFingerprint: z.string().optional(),
  attributeFingerprint: z.string().optional(),
  ancestorFingerprint: z.string().optional(),
  boundingBox: BoundingBox,
  viewportSize: Size,
  devicePixelRatio: z.number(),
  scrollPosition: Point,
  urlPath: z.string(),
});
export type Anchor = z.infer<typeof Anchor>;

export const Pin = z.object({
  id: z.string(),
  sessionId: z.string(),
  index: z.number().int().positive(),
  title: z.string(),
  body: z.string().default(""),
  severity: Severity,
  type: PinType,
  status: Status,
  assigneeId: z.string().optional(),
  anchor: Anchor.optional(),
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  screenshotId: z.string().optional(),
  stale: z.boolean().default(false),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Pin = z.infer<typeof Pin>;

/** The dashboard unit: all pins from one URL sitting roll up into one session. */
export const Session = z.object({
  id: z.string(),
  orgId: z.string(),
  shortId: z.string(),
  title: z.string(),
  pageUrl: z.string(),
  urlPath: z.string(),
  faviconLabel: z.string(),
  faviconHue: z.number(),
  pinboardId: z.string().optional(),
  reporterId: z.string(),
  status: Status,
  reviewTag: z.string().optional(),
  pinCount: z.number().int().nonnegative(),
  severityCounts: SeverityCounts,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Session = z.infer<typeof Session>;

export const Comment = z.object({
  id: z.string(),
  scope: z.enum(["session", "pin"]),
  targetId: z.string(),
  authorId: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type Comment = z.infer<typeof Comment>;

export const ActivityEvent = z.object({
  id: z.string(),
  scope: z.enum(["session", "pin"]),
  targetId: z.string(),
  kind: z.enum(["pinned", "sync", "assign", "status", "comment"]),
  actorId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  createdAt: z.string(),
});
export type ActivityEvent = z.infer<typeof ActivityEvent>;

export const Integration = z.object({
  id: z.string(),
  orgId: z.string(),
  kind: IntegrationKind,
  connected: z.boolean(),
  account: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  createdAt: z.string(),
});
export type Integration = z.infer<typeof Integration>;

export const SyncRecord = z.object({
  id: z.string(),
  pinId: z.string(),
  integrationId: z.string(),
  externalKey: z.string().optional(),
  state: SyncState,
  lastSyncedAt: z.string().optional(),
});
export type SyncRecord = z.infer<typeof SyncRecord>;
