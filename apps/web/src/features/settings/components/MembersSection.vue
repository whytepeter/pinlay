<script setup lang="ts">
import { reactive, ref } from "vue";
import type { Role } from "@pinlay/shared";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pinlay/design";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import { useSettings } from "../composables/useSettings";
import SectionHeading from "./SectionHeading.vue";

const {
  members,
  setMemberRole,
  removeMember,
  inviteMember,
  resendInvite,
  revokeInvite,
} = useSettings();

function timeAgo(iso?: string) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ROLES: { value: Role; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const inviteOpen = ref(false);
const invite = reactive<{ email: string; role: Role }>({
  email: "",
  role: "member",
});

function submitInvite() {
  if (!invite.email.trim()) return;
  inviteMember(invite.email.trim(), invite.role);
  invite.email = "";
  invite.role = "member";
  inviteOpen.value = false;
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
        v-model="invite.email"
        type="email"
        placeholder="Invite by email"
        class="flex-1 border-0 bg-transparent focus-visible:ring-0"
        @keydown.enter="submitInvite"
      />
    </div>
    <div class="flex items-center gap-2">
      <Select v-model="invite.role">
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
        :disabled="!invite.email.trim()"
        class="flex-1 sm:flex-none"
        @click="submitInvite"
      >
        Send invite
      </Button>
    </div>
  </div>

  <!-- members table; row stacks on mobile -->
  <div class="overflow-hidden rounded-lg border bg-card">
    <div
      class="hidden gap-4 border-b bg-muted/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_120px_36px]"
    >
      <div>Member</div>
      <div>Role</div>
      <div />
    </div>

    <div
      v-for="(m, i) in members"
      :key="m.id"
      class="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[1fr_120px_36px] sm:items-center sm:gap-4"
      :class="i !== members.length - 1 ? 'border-b' : ''"
    >
      <div class="flex min-w-0 items-center gap-3">
        <UserAvatar
          :name="m.name"
          :hue="m.avatarHue"
          :size="28"
          :class="m.status !== 'active' ? 'opacity-60' : ''"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p
              class="truncate text-sm font-medium"
              :class="m.status !== 'active' ? 'text-muted-foreground' : ''"
            >
              {{ m.name }}
            </p>
            <span
              v-if="m.status === 'pending'"
              class="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400"
            >
              <span class="size-1 rounded-full bg-amber-500" />
              Pending
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">
            {{ m.email }}
            <span v-if="m.status === 'pending' && m.invitedAt">
              · invited {{ timeAgo(m.invitedAt) }}
            </span>
          </p>
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
          @update:model-value="(v) => setMemberRole(m.id, v as Role)"
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
              :disabled="m.role === 'owner'"
              :title="m.role === 'owner' ? 'Owner cannot be removed' : 'More'"
            >
              <Icon name="ellipsis" :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <template v-if="m.status === 'pending'">
              <DropdownMenuItem @click="resendInvite(m.id)">
                <Icon name="send" :size="14" /> Resend invite
              </DropdownMenuItem>
              <DropdownMenuItem
                class="text-destructive"
                @click="revokeInvite(m.id)"
              >
                <Icon name="x" :size="14" /> Revoke invite
              </DropdownMenuItem>
            </template>
            <DropdownMenuItem
              v-else
              class="text-destructive"
              @click="removeMember(m.id)"
            >
              <Icon name="user-minus" :size="14" /> Remove from workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>

  <!-- bulk-invite dialog (kept for multi-step flow) -->
  <Dialog v-model:open="inviteOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invite teammates</DialogTitle>
        <DialogDescription>
          They&rsquo;ll receive an email with a link to join the workspace.
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-4 py-2">
        <div class="grid gap-2">
          <Label for="invite-email-dlg">Email</Label>
          <Input
            id="invite-email-dlg"
            v-model="invite.email"
            type="email"
            placeholder="teammate@company.com"
            @keydown.enter="submitInvite"
          />
        </div>
        <div class="grid gap-2">
          <Label for="invite-role-dlg">Role</Label>
          <Select v-model="invite.role">
            <SelectTrigger id="invite-role-dlg">
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
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" size="sm" @click="inviteOpen = false">
          Cancel
        </Button>
        <Button
          size="sm"
          :disabled="!invite.email.trim()"
          @click="submitInvite"
        >
          Send invite
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
