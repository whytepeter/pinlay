<script setup lang="ts">
import { reactive, ref } from "vue";
import type { Role } from "@pinlayer/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pinlayer/design";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import { useShell } from "@/shared/composables/useShell";
import { useTheme } from "@/shared/composables/useTheme";
import { useSettings } from "@/features/settings/composables/useSettings";

const { toggleMobile } = useShell();
const { mode, cycle } = useTheme();
const { profile, members, inviteMember } = useSettings();

const themeIcon = { light: "sun", dark: "moon", system: "monitor" } as const;

// Current user first, then up to 2 other teammates by id (skip the owner if
// they're the current user — they already appear).
const team = (() => {
  const others = members.value
    .filter((m) => m.id !== profile.value.id)
    .slice(0, 2);
  return [
    {
      id: profile.value.id,
      name: profile.value.name,
      hue: profile.value.avatarHue,
    },
    ...others.map((m) => ({ id: m.id, name: m.name, hue: m.avatarHue })),
  ];
})();

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
  <header
    class="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur"
  >
    <Button
      variant="ghost"
      size="icon"
      class="-ml-1.5 md:hidden"
      title="Menu"
      @click="toggleMobile"
    >
      <Icon name="menu" :size="16" />
    </Button>

    <!-- team avatars + invite -->
    <div class="flex items-center gap-2">
      <div class="flex -space-x-2">
        <Tooltip v-for="m in team" :key="m.id">
          <TooltipTrigger as-child>
            <UserAvatar
              :name="m.name"
              :hue="m.hue"
              :size="24"
              class="ring-2 ring-background"
            />
          </TooltipTrigger>
          <TooltipContent>{{ m.name }}</TooltipContent>
        </Tooltip>
      </div>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="icon-sm"
            class="rounded-full"
            @click="inviteOpen = true"
          >
            <Icon name="plus" :size="14" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Invite a teammate</TooltipContent>
      </Tooltip>
    </div>

    <div class="flex-1" />

    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          variant="ghost"
          size="icon"
          :title="`Theme: ${mode}`"
          @click="cycle"
        >
          <Icon :name="themeIcon[mode]" :size="16" />
        </Button>
      </TooltipTrigger>
      <TooltipContent class="capitalize">Theme: {{ mode }}</TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="icon" title="Notifications">
          <Icon name="bell" :size="16" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Notifications</TooltipContent>
    </Tooltip>

    <Dialog v-model:open="inviteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They&rsquo;ll receive an email with a link to join the workspace.
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-4 py-2">
          <div class="grid gap-2">
            <Label for="sb-invite-email">Email</Label>
            <Input
              id="sb-invite-email"
              v-model="invite.email"
              type="email"
              placeholder="teammate@company.com"
              @keydown.enter="submitInvite"
            />
          </div>
          <div class="grid gap-2">
            <Label for="sb-invite-role">Role</Label>
            <Select v-model="invite.role">
              <SelectTrigger id="sb-invite-role" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
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
  </header>
</template>
