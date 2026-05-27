import { reactive, ref } from "vue";
import type { IntegrationKind, Role, User } from "@pinlayer/shared";
import { PEOPLE } from "@/shared/lib/data";

export interface Member extends User {
  role: Role;
}

export interface WorkspaceState {
  name: string;
  slug: string;
  defaultIntegration: IntegrationKind;
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
});
const members = ref<Member[]>(
  PEOPLE.map((p, i) => ({ ...p, role: DEFAULT_ROLES[i] ?? "member" })),
);
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
    });
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
  };
}
