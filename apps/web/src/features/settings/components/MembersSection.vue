<script setup lang="ts">
import { reactive, ref } from "vue";
import type { Role } from "@pinlayer/shared";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@pinlayer/design";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import { useSettings } from "../composables/useSettings";
import SectionHeading from "./SectionHeading.vue";

const { members, setMemberRole, removeMember, inviteMember } = useSettings();

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
    <div class="flex flex-1 items-center gap-2">
      <Icon name="user-plus" :size="14" class="text-primary" />
      <Input
        v-model="invite.email"
        type="email"
        placeholder="Invite by email"
        class="flex-1 border-0 bg-transparent px-0 focus-visible:ring-0"
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
        <UserAvatar :name="m.name" :hue="m.avatarHue" :size="28" />
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
            <DropdownMenuItem
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
