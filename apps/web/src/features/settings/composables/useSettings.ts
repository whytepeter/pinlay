import { reactive, ref } from "vue";
import type { IntegrationKind, Role, User } from "@pinlay/shared";
import { PEOPLE } from "@/shared/lib/data";

export type MemberStatus = "active" | "pending" | "expired";

export interface Member extends User {
  role: Role;
  status: MemberStatus;
  invitedAt?: string; // ISO; set when status === "pending"
}

export type PlanId = "free" | "team";

export interface WorkspaceState {
  name: string;
  slug: string;
  defaultIntegration: IntegrationKind;
  plan: PlanId;
}

export type NotificationKey =
  | "newComment"
  | "pinAssigned"
  | "mentioned"
  | "statusChanged"
  | "criticalLanded"
  | "syncFailed"
  | "weeklyDigest";

export type NotificationPrefs = Record<
  NotificationKey,
  { email: boolean; slack: boolean }
>;

const DEFAULT_ROLES: Role[] = ["owner", "admin", "member", "member", "member"];

// Module-level state so navigating between tabs preserves edits.
const profile = ref<User>({ ...PEOPLE[0]! });
const workspace = reactive<WorkspaceState>({
  name: "Acme Inc",
  slug: "acme",
  defaultIntegration: "linear",
  plan: "team",
});
const members = ref<Member[]>([
  ...PEOPLE.map<Member>((p, i) => ({
    ...p,
    role: DEFAULT_ROLES[i] ?? "member",
    status: "active",
  })),
  // One pre-seeded pending invite so the UI shows the state out of the box.
  {
    id: "u_pending_alex",
    orgId: PEOPLE[0]!.orgId,
    email: "alex@acme.com",
    name: "alex",
    avatarHue: 210,
    role: "member",
    status: "pending",
    invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 26h ago
  },
]);
const notifications = reactive<NotificationPrefs>({
  newComment: { email: true, slack: true },
  pinAssigned: { email: true, slack: true },
  mentioned: { email: true, slack: true },
  statusChanged: { email: false, slack: true },
  criticalLanded: { email: true, slack: true },
  syncFailed: { email: false, slack: true },
  weeklyDigest: { email: true, slack: false },
});

export function useSettings() {
  function updateProfile(next: Partial<User>) {
    profile.value = { ...profile.value, ...next };
  }
  function updateWorkspace(next: Partial<WorkspaceState>) {
    Object.assign(workspace, next);
  }
  function setMemberRole(id: string, role: Role) {
    const m = members.value.find((x) => x.id === id);
    if (m) m.role = role;
  }
  function removeMember(id: string) {
    members.value = members.value.filter((m) => m.id !== id);
  }
  function inviteMember(email: string, role: Role) {
    const handle = email.split("@")[0] ?? "user";
    members.value.push({
      id: `u_${handle}_${Date.now()}`,
      orgId: profile.value.orgId,
      email,
      name: handle,
      avatarHue: Math.floor(Math.random() * 360),
      role,
      status: "pending",
      invitedAt: new Date().toISOString(),
    });
  }
  function resendInvite(id: string) {
    const m = members.value.find((x) => x.id === id);
    if (m && m.status !== "active") {
      m.status = "pending";
      m.invitedAt = new Date().toISOString();
    }
  }
  function revokeInvite(id: string) {
    members.value = members.value.filter((m) => m.id !== id);
  }
  function setPlan(plan: PlanId) {
    workspace.plan = plan;
  }

  return {
    profile,
    workspace,
    members,
    notifications,
    updateProfile,
    updateWorkspace,
    setMemberRole,
    removeMember,
    inviteMember,
    resendInvite,
    revokeInvite,
    setPlan,
  };
}
