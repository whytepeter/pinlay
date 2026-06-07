<!--
  Global confirm dialog. Mounted once in App.vue. State lives in
  `shared/lib/confirm.ts`; call sites use `await confirm({...})` from that
  module — they never reference this component directly.

  When the caller passes `onConfirm`, the dialog stays open with the
  confirm button in a loading state until the action settles. On failure
  the dialog stays open with an inline retry hint.
-->
<script setup lang="ts">
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
} from "@pinlay/design";
import {
  acceptConfirm,
  cancelConfirm,
  confirmState,
} from "@/shared/lib/confirm";

function onOpenChange(next: boolean) {
  // Closing via Esc, overlay click, or X → treat as Cancel (ignored while
  // a destructive action is in flight, see cancelConfirm).
  if (!next) cancelConfirm();
}
</script>

<template>
  <Dialog :open="confirmState.open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>{{ confirmState.title }}</DialogTitle>
        <DialogDescription>{{ confirmState.message }}</DialogDescription>
      </DialogHeader>

      <!-- Inline error — only shown after a failed action attempt, so the
           user knows the dialog stayed open on purpose and can retry. -->
      <p
        v-if="confirmState.error"
        class="-mt-1 flex items-start gap-1.5 text-[12.5px] leading-snug text-destructive"
      >
        <Icon name="triangle-alert" :size="13" class="mt-px shrink-0" />
        <span>{{ confirmState.error }}</span>
      </p>

      <DialogFooter class="gap-2 sm:gap-2">
        <Button
          variant="outline"
          :disabled="confirmState.loading"
          @click="cancelConfirm"
        >
          {{ confirmState.cancelLabel }}
        </Button>
        <Button
          :variant="
            confirmState.variant === 'destructive' ? 'destructive' : 'default'
          "
          :disabled="confirmState.loading"
          @click="acceptConfirm"
        >
          <Icon
            v-if="confirmState.loading"
            name="loader-circle"
            :size="14"
            class="animate-spin"
          />
          {{ confirmState.confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
