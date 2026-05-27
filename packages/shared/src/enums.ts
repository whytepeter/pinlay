import { z } from "zod";

export const Severity = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof Severity>;

/** Pin-level status + session lifecycle states. */
export const Status = z.enum([
  "open",
  "in_progress",
  "resolved",
  "draft",
  "archived",
]);
export type Status = z.infer<typeof Status>;

/** The three statuses the UI renders as chips (dense rows / detail header). */
export const DisplayStatus = z.enum(["open", "in_progress", "resolved"]);
export type DisplayStatus = z.infer<typeof DisplayStatus>;

export const PinType = z.enum([
  "visual",
  "layout",
  "copy",
  "broken",
  "missing",
  "a11y",
  "perf",
  "other",
]);
export type PinType = z.infer<typeof PinType>;

export const SyncState = z.enum(["ok", "pending", "failed"]);
export type SyncState = z.infer<typeof SyncState>;

export const Role = z.enum(["owner", "admin", "member", "viewer"]);
export type Role = z.infer<typeof Role>;

export const IntegrationKind = z.enum([
  "linear",
  "jira",
  "github",
  "gitlab",
  "azure",
  "shortcut",
  "slack",
  "teams",
  "discord",
  "figma",
  "storybook",
  "notion",
  "confluence",
  "webhook",
]);
export type IntegrationKind = z.infer<typeof IntegrationKind>;
