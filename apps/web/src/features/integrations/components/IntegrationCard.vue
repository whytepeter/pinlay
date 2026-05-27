<script setup lang="ts">
import { ref } from "vue";
import {
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
  Input,
  Label,
} from "@pinlayer/design";
import {
  useIntegrations,
  type IntegrationItem,
} from "../composables/useIntegrations";

const props = defineProps<{ integration: IntegrationItem }>();
const { connect, disconnect, updateAccount } = useIntegrations();

const connectOpen = ref(false);
const editOpen = ref(false);
const draftAccount = ref("");

function openConnect() {
  draftAccount.value = "";
  connectOpen.value = true;
}
function submitConnect() {
  if (!draftAccount.value.trim()) return;
  connect(props.integration.id, draftAccount.value);
  connectOpen.value = false;
}

function openEdit() {
  draftAccount.value = props.integration.account ?? "";
  editOpen.value = true;
}
function submitEdit() {
  if (!draftAccount.value.trim()) return;
  updateAccount(props.integration.id, draftAccount.value);
  editOpen.value = false;
}
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
  >
    <div class="flex items-start gap-3">
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary text-foreground"
      >
        <Icon :name="integration.icon" :size="18" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <p class="truncate text-sm font-medium">{{ integration.name }}</p>
          <span
            class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {{ integration.category }}
          </span>
        </div>
        <div
          class="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <span
            class="size-1.5 rounded-full"
            :style="{
              background: integration.connected
                ? 'var(--status-resolved)'
                : 'var(--text-3)',
            }"
          />
          {{
            integration.connected
              ? integration.account
              : "Not connected"
          }}
        </div>
      </div>
    </div>

    <p class="text-xs leading-relaxed text-muted-foreground">
      {{ integration.blurb }}
    </p>

    <div class="mt-auto flex items-center justify-end gap-2 pt-1">
      <!-- Connected → configure menu -->
      <template v-if="integration.connected">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm">
              Configure <Icon name="chevron-down" :size="13" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="openEdit">
              <Icon name="pencil" :size="14" /> Edit account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              class="text-destructive"
              @click="disconnect(integration.id)"
            >
              <Icon name="plug" :size="14" /> Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog v-model:open="editOpen">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{{ integration.name }} settings</DialogTitle>
              <DialogDescription>
                Update the connected account or workspace.
              </DialogDescription>
            </DialogHeader>
            <div class="grid gap-2 py-2">
              <Label :for="`acct-${integration.id}`">Account</Label>
              <Input
                :id="`acct-${integration.id}`"
                v-model="draftAccount"
                autocomplete="off"
                @keydown.enter="submitEdit"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" @click="editOpen = false">
                Cancel
              </Button>
              <Button
                size="sm"
                :disabled="!draftAccount.trim()"
                @click="submitEdit"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </template>

      <!-- Not connected → connect dialog -->
      <Dialog v-else v-model:open="connectOpen">
        <DialogTrigger as-child>
          <Button size="sm" @click="openConnect">Connect</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {{ integration.name }}</DialogTitle>
            <DialogDescription>
              {{ integration.blurb }}
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-2 py-2">
            <Label :for="`connect-${integration.id}`">
              {{
                integration.id === "slack"
                  ? "Channel"
                  : integration.id === "webhook"
                    ? "Endpoint URL"
                    : "Workspace"
              }}
            </Label>
            <Input
              :id="`connect-${integration.id}`"
              v-model="draftAccount"
              :placeholder="
                integration.id === 'slack'
                  ? '#bugs'
                  : integration.id === 'webhook'
                    ? 'https://example.com/hooks/pinlayer'
                    : 'acme'
              "
              autocomplete="off"
              @keydown.enter="submitConnect"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" @click="connectOpen = false">
              Cancel
            </Button>
            <Button
              size="sm"
              :disabled="!draftAccount.trim()"
              @click="submitConnect"
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>
