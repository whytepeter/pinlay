<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
} from "@pinlay/design";
import UserAvatar from "@/shared/components/UserAvatar.vue";
import { useShell } from "@/shared/composables/useShell";
import { useTheme } from "@/shared/composables/useTheme";
import { useAuth } from "@/shared/composables/useAuth";
import { apiClient, type InviteResult } from "@/shared/lib/api";
import { hashHue } from "@/shared/lib/issue-display";
import { toast } from "@/shared/lib/toast";

type Role = "owner" | "admin" | "member" | "viewer";

const { toggleMobile } = useShell();
const { mode, cycle } = useTheme();
const { user } = useAuth();
const queryClient = useQueryClient();

const themeIcon = { light: "sun", dark: "moon", system: "monitor" } as const;

// ── Team stack: current user + up to 2 others, with a "+N" chip when there's
// more. Reactive — re-renders when /workspaces/members resolves or invalidates.
const membersQuery = useQuery({
  queryKey: ["workspace", "members"],
  queryFn: () => apiClient.workspaces.members(),
});

interface TeamSlot {
  id: string;
  name: string;
  hue: number;
}

const MAX_VISIBLE_OTHERS = 2;

const team = computed<TeamSlot[]>(() => {
  const me = user.value;
  const all = membersQuery.data.value ?? [];
  const meSlot: TeamSlot | null = me
    ? { id: me.id, name: me.name, hue: hashHue(me.id) }
    : null;
  const others = all
    .filter((m) => m.userId !== me?.id)
    .slice(0, MAX_VISIBLE_OTHERS)
    .map<TeamSlot>((m) => ({
      id: m.userId,
      name: m.name,
      hue: hashHue(m.userId),
    }));
  return meSlot ? [meSlot, ...others] : others;
});

const overflowCount = computed(() => {
  const all = membersQuery.data.value ?? [];
  const others = all.filter((m) => m.userId !== user.value?.id);
  return Math.max(0, others.length - MAX_VISIBLE_OTHERS);
});

// ── Invite dialog ──────────────────────────────────────────────────────────
const inviteOpen = ref(false);
const invite = reactive<{ email: string; role: Role }>({
  email: "",
  role: "member",
});

const inviteMutation = useMutation({
  mutationFn: (input: { email: string; role: Role }) =>
    apiClient.workspaces.invite(input),
  onSuccess: (res: InviteResult) => {
    // Refresh BOTH lists — members (StatusBar avatar stack + Settings) and
    // invites (Settings pending rows). Settings reads them via two queries
    // and merges client-side.
    queryClient.invalidateQueries({ queryKey: ["workspace", "members"] });
    queryClient.invalidateQueries({ queryKey: ["workspace", "invites"] });
    queryClient.invalidateQueries({ queryKey: ["workspace", "current"] });
    if (res.kind === "member") {
      toast.success(`${res.member.name} joined the workspace`);
    } else {
      toast.success(`Invite sent to ${res.invite.email}`);
    }
    invite.email = "";
    invite.role = "member";
    inviteOpen.value = false;
  },
  onError: (err) => toast.error(err),
});

async function submitInvite() {
  const email = invite.email.trim();
  if (!email || inviteMutation.isPending.value) return;
  inviteMutation.mutate({ email, role: invite.role });
}
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-bg-1/80 px-4 backdrop-blur"
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
      <!-- Skeleton while members load — keeps the bar from jumping when the
           list resolves. Renders as ghost dots, same dimensions as a real
           avatar so the +invite button doesn't shift. -->
      <div
        v-if="membersQuery.isPending.value"
        class="flex -space-x-2"
        aria-hidden="true"
      >
        <span
          v-for="i in 2"
          :key="`sk-${i}`"
          class="size-[22px] rounded-full bg-muted ring-2 ring-background"
        />
      </div>
      <div v-else class="flex -space-x-2">
        <Tooltip v-for="m in team" :key="m.id">
          <TooltipTrigger as-child>
            <span class="inline-flex">
              <UserAvatar
                :name="m.name"
                :hue="m.hue"
                :size="22"
                class="ring-2 ring-background"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ m.name }}</TooltipContent>
        </Tooltip>
        <!-- "+N" chip when there's more team beyond what we show inline -->
        <Tooltip v-if="overflowCount > 0">
          <TooltipTrigger as-child>
            <RouterLink
              :to="{ name: 'settings', params: { section: 'members' } }"
              class="flex size-[22px] items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background transition-colors hover:bg-muted-foreground/20"
            >
              +{{ overflowCount }}
            </RouterLink>
          </TooltipTrigger>
          <TooltipContent>{{ overflowCount }} more · view all</TooltipContent>
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

    <div class="flex items-center">
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

      <!-- Help & install (moved from the sidebar so the footer there can stay
         focused on identity). Full content: bug report, support, docs, and
         the "Install extension" CTA. -->
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger as-child>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" title="Help & install">
                <Icon name="circle-help" :size="16" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem>
                <Icon name="message-square-warning" :size="14" /> Send a bug
                report
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Icon name="life-buoy" :size="14" /> Contact support
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Icon name="book-open" :size="14" /> Docs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Icon name="download" :size="14" /> Install browser extension
              </DropdownMenuItem>
            </DropdownMenuContent>
          </TooltipTrigger>
          <TooltipContent>Help &amp; install</TooltipContent>
        </Tooltip>
      </DropdownMenu>
    </div>

    <Dialog v-model:open="inviteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They&rsquo;ll join the workspace as soon as they sign up — or
            instantly if they already have a pinlay account.
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
              :disabled="inviteMutation.isPending.value"
              @keydown.enter="submitInvite"
            />
          </div>
          <div class="grid gap-2">
            <Label for="sb-invite-role">Role</Label>
            <Select v-model="invite.role">
              <SelectTrigger
                id="sb-invite-role"
                class="w-full"
                :disabled="inviteMutation.isPending.value"
              >
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
          <Button
            variant="ghost"
            size="sm"
            :disabled="inviteMutation.isPending.value"
            @click="inviteOpen = false"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            :disabled="!invite.email.trim() || inviteMutation.isPending.value"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </header>
</template>
