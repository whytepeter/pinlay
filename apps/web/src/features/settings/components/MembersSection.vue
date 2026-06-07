<script setup lang="ts">
import { computed, reactive } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@pinlay/design";
import {
  apiClient,
  type InviteResult,
  type WorkspaceInviteRow,
  type WorkspaceMemberRow,
} from "@/shared/lib/api";
import { hashHue } from "@/shared/lib/issue-display";
import { confirm } from "@/shared/lib/confirm";
import { toast } from "@/shared/lib/toast";
import { timeAgo } from "@/shared/lib/format";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import SectionHeading from "./SectionHeading.vue";

type Role = "owner" | "admin" | "member" | "viewer";

const ROLES: { value: Role; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const queryClient = useQueryClient();

const membersQuery = useQuery({
  queryKey: ["workspace", "members"],
  queryFn: () => apiClient.workspaces.members(),
});
const invitesQuery = useQuery({
  queryKey: ["workspace", "invites"],
  queryFn: () => apiClient.workspaces.invites(),
});

const members = computed<WorkspaceMemberRow[]>(
  () => membersQuery.data.value ?? [],
);
const invites = computed<WorkspaceInviteRow[]>(
  () => invitesQuery.data.value ?? [],
);

const isLoading = computed(
  () => membersQuery.isPending.value || invitesQuery.isPending.value,
);
const hasError = computed(
  () => membersQuery.isError.value || invitesQuery.isError.value,
);

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ["workspace", "members"] });
  queryClient.invalidateQueries({ queryKey: ["workspace", "invites"] });
  queryClient.invalidateQueries({ queryKey: ["workspace", "current"] });
}

const inviteForm = reactive<{ email: string; role: Role }>({
  email: "",
  role: "member",
});

const inviteMutation = useMutation({
  mutationFn: (input: { email: string; role: Role }) =>
    apiClient.workspaces.invite(input),
  onSuccess: (res: InviteResult) => {
    invalidate();
    if (res.kind === "member") {
      toast.success(`${res.member.name} joined the workspace`);
    } else {
      toast.success(`Invite sent to ${res.invite.email}`);
    }
    inviteForm.email = "";
    inviteForm.role = "member";
  },
  onError: (err: unknown) => {
    const message = err instanceof Error ? err.message : "Couldn't send invite.";
    toast.error(message);
  },
});

const updateMutation = useMutation({
  mutationFn: (input: { id: string; role: Role }) =>
    apiClient.workspaces.updateMember(input.id, { role: input.role }),
  onSuccess: (m) => {
    invalidate();
    toast.success(`Updated role for ${m.name}`);
  },
  onError: (err) => toast.error(err),
});

const removeMutation = useMutation({
  mutationFn: (id: string) => apiClient.workspaces.removeMember(id),
  onSuccess: (_, id) => {
    const removed = members.value.find((m) => m.id === id);
    invalidate();
    toast.success(removed ? `Removed ${removed.name}` : "Member removed");
  },
  onError: (err) => toast.error(err),
});

const resendMutation = useMutation({
  mutationFn: (id: string) => apiClient.workspaces.resendInvite(id),
  onSuccess: (inv) => {
    invalidate();
    toast.success(`Invite to ${inv.email} resent`);
  },
  onError: (err) => toast.error(err),
});

const revokeMutation = useMutation({
  mutationFn: (id: string) => apiClient.workspaces.revokeInvite(id),
  onSuccess: (_, id) => {
    const inv = invites.value.find((i) => i.id === id);
    invalidate();
    toast.success(inv ? `Invite to ${inv.email} revoked` : "Invite revoked");
  },
  onError: (err) => toast.error(err),
});

function submitInvite() {
  const email = inviteForm.email.trim();
  if (!email || inviteMutation.isPending.value) return;
  inviteMutation.mutate({ email, role: inviteForm.role });
}

function changeRole(m: WorkspaceMemberRow, role: Role) {
  if (m.role === role) return;
  updateMutation.mutate({ id: m.id, role });
}

function confirmRemove(m: WorkspaceMemberRow) {
  return confirm({
    title: "Remove member?",
    message: `Remove ${m.name} from this workspace?`,
    confirmLabel: "Remove",
    variant: "destructive",
    onConfirm: () => removeMutation.mutateAsync(m.id),
  });
}

function confirmRevoke(inv: WorkspaceInviteRow) {
  return confirm({
    title: "Revoke invite?",
    message: `Revoke the invite to ${inv.email}?`,
    confirmLabel: "Revoke",
    variant: "destructive",
    onConfirm: () => revokeMutation.mutateAsync(inv.id),
  });
}

// TODO(api): email pipeline isn't wired yet — admins copy the accept link
// and share it manually. Compose from window.location.origin so the link
// matches whichever environment the admin is in (dev / preview / prod).
async function copyInviteLink(inv: WorkspaceInviteRow) {
  const url = `${window.location.origin}/invite/${inv.token}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  } catch {
    toast.error("Couldn't copy link. Long-press the link to copy manually.");
  }
}
</script>

<template>
  <SectionHeading
    title="Members"
    subtitle="Manage who can drop, view, and triage pins."
  />

  <!-- inline invite row (stacks on mobile) -->
  <div
    class="mb-3 flex flex-col gap-2 rounded-lg border bg-card p-2 sm:flex-row sm:items-center sm:gap-2 sm:px-3 sm:py-2"
  >
    <div class="flex flex-1 items-center gap-1">
      <Icon name="user-plus" :size="14" class="text-primary" />
      <Input
        v-model="inviteForm.email"
        type="email"
        placeholder="Invite by email"
        class="flex-1 border-0 bg-transparent focus-visible:ring-0"
        :disabled="inviteMutation.isPending.value"
        @keydown.enter="submitInvite"
      />
    </div>
    <div class="flex items-center gap-2">
      <Select v-model="inviteForm.role">
        <SelectTrigger class="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="r in ROLES.filter((x) => x.value !== 'owner')"
            :key="r.value"
            :value="r.value"
          >
            {{ r.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        :disabled="
          !inviteForm.email.trim() || inviteMutation.isPending.value
        "
        class="flex-1 sm:flex-none"
        @click="submitInvite"
      >
        <Icon
          v-if="inviteMutation.isPending.value"
          name="loader-circle"
          :size="14"
          class="animate-spin"
        />
        {{ inviteMutation.isPending.value ? "Sending…" : "Send invite" }}
      </Button>
    </div>
  </div>

  <!-- loading / error -->
  <div v-if="isLoading" class="overflow-hidden rounded-lg border bg-card">
    <div
      class="hidden gap-4 border-b bg-muted/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_120px_36px]"
    >
      <div>Member</div>
      <div>Role</div>
      <div />
    </div>
    <div
      v-for="i in 4"
      :key="`mem-sk-${i}`"
      class="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_120px_36px] sm:items-center sm:gap-4"
      :class="i !== 4 ? 'border-b' : ''"
    >
      <div class="flex min-w-0 items-center gap-3">
        <Skeleton class="size-7 rounded-full" />
        <div class="min-w-0 flex-1 space-y-1.5">
          <Skeleton class="h-3.5 w-32" />
          <Skeleton class="h-3 w-44" />
        </div>
      </div>
      <Skeleton class="h-8 flex-1 sm:w-full sm:flex-none" />
      <Skeleton class="size-7 rounded-md" />
    </div>
  </div>
  <div
    v-else-if="hasError"
    class="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
  >
    <p class="text-sm text-destructive">Couldn't load members.</p>
    <Button
      variant="outline"
      size="sm"
      @click="() => { membersQuery.refetch(); invitesQuery.refetch(); }"
    >
      Try again
    </Button>
  </div>

  <!-- table: active members + pending invites in one list, active first -->
  <div v-else class="overflow-hidden rounded-lg border bg-card">
    <div
      class="hidden gap-4 border-b bg-muted/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_120px_36px]"
    >
      <div>Member</div>
      <div>Role</div>
      <div />
    </div>

    <!-- active members -->
    <div
      v-for="(m, i) in members"
      :key="`m-${m.id}`"
      class="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_120px_36px] sm:items-center sm:gap-4"
      :class="
        i !== members.length - 1 || invites.length > 0 ? 'border-b' : ''
      "
    >
      <div class="flex min-w-0 items-center gap-3">
        <UserAvatar :name="m.name" :hue="hashHue(m.userId)" :size="28" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ m.name }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ m.email }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:contents">
        <Badge
          v-if="m.role === 'owner'"
          variant="secondary"
          class="sm:justify-self-start"
        >
          Owner
        </Badge>
        <Select
          v-else
          :model-value="m.role"
          :disabled="updateMutation.isPending.value"
          @update:model-value="(v) => changeRole(m, v as Role)"
        >
          <SelectTrigger class="flex-1 sm:w-full sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="r in ROLES.filter((x) => x.value !== 'owner')"
              :key="r.value"
              :value="r.value"
            >
              {{ r.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              :disabled="m.role === 'owner' || removeMutation.isPending.value"
              :title="m.role === 'owner' ? 'Owner cannot be removed' : 'More'"
            >
              <Icon name="ellipsis" :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              class="text-destructive"
              @click="confirmRemove(m)"
            >
              <Icon name="user-minus" :size="14" /> Remove from workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- pending invites — visually dimmed + Pending chip + invited-Xh-ago -->
    <div
      v-for="(inv, i) in invites"
      :key="`i-${inv.id}`"
      class="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_120px_36px] sm:items-center sm:gap-4"
      :class="i !== invites.length - 1 ? 'border-b' : ''"
    >
      <div class="flex min-w-0 items-center gap-3">
        <UserAvatar
          :name="inv.email"
          :hue="hashHue(inv.email)"
          :size="28"
          class="opacity-50"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="truncate text-sm font-medium text-muted-foreground">
              {{ inv.email }}
            </p>
            <span
              class="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400"
            >
              <span class="size-1 rounded-full bg-amber-500" />
              Pending
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">
            Invited {{ timeAgo(inv.invitedAt) }} by {{ inv.invitedBy.name }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:contents">
        <Badge variant="secondary" class="capitalize sm:justify-self-start">
          {{ inv.role }}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              :disabled="
                resendMutation.isPending.value || revokeMutation.isPending.value
              "
              title="More"
            >
              <Icon name="ellipsis" :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="copyInviteLink(inv)">
              <Icon name="link" :size="14" /> Copy invite link
            </DropdownMenuItem>
            <DropdownMenuItem @click="resendMutation.mutate(inv.id)">
              <Icon name="send" :size="14" /> Resend invite
            </DropdownMenuItem>
            <DropdownMenuItem
              class="text-destructive"
              @click="confirmRevoke(inv)"
            >
              <Icon name="x" :size="14" /> Revoke invite
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>
