<script setup lang="ts">
import { Toaster } from "vue-sonner";
import ConfirmDialog from "@/shared/components/ConfirmDialog.vue";
</script>

<template>
  <RouterView />
  <!-- Singleton confirm dialog — drives all `await confirm({...})` calls. -->
  <ConfirmDialog />
  <Toaster
    position="bottom-right"
    :offset="16"
    :gap="10"
    :duration="4000"
    :visible-toasts="4"
    :toast-options="{
      classes: {
        toast: 'pl-toast',
        title: 'pl-toast-title',
        description: 'pl-toast-description',
        actionButton: 'pl-toast-action',
        cancelButton: 'pl-toast-cancel',
        closeButton: 'pl-toast-close',
        icon: 'pl-toast-icon',
      },
    }"
    close-button
    rich-colors
  />
</template>

<style>
/* Sits above sticky bars + sidebars. Sonner already uses a very high
   z-index but we layer one notch higher as a belt-and-braces. */
[data-sonner-toaster] {
  z-index: 2147483600;
  --width: 360px;
}

/* ── Base toast surface ──────────────────────────────────────────────────
   Restyle Sonner's default white card to use our design tokens. Each toast
   gets a thin coloured left bar that matches its semantic type so users can
   identify success / error / info / warning at a glance. */
[data-sonner-toast].pl-toast {
  background: var(--card);
  color: var(--foreground);
  border: 1px solid var(--border);
  border-left: 3px solid var(--muted-foreground);
  border-radius: var(--radius);
  box-shadow:
    0 8px 24px -6px color-mix(in oklab, var(--foreground) 18%, transparent),
    0 2px 4px -2px color-mix(in oklab, var(--foreground) 10%, transparent);
  padding: 12px 14px 12px 14px;
  font-size: 13px;
  line-height: 1.45;
}

[data-sonner-toast].pl-toast[data-type="success"] {
  border-left-color: #10b981; /* emerald — matches --status-resolved */
}
[data-sonner-toast].pl-toast[data-type="error"] {
  border-left-color: var(--destructive);
}
[data-sonner-toast].pl-toast[data-type="warning"] {
  border-left-color: #f59e0b;
}
[data-sonner-toast].pl-toast[data-type="info"] {
  border-left-color: var(--primary);
}

/* Icon sizing & per-type tint. Sonner renders its own SVGs via
   `rich-colors`; we just align them with the bar colour above. */
[data-sonner-toast] .pl-toast-icon {
  margin-top: 1px;
}
[data-sonner-toast] .pl-toast-icon > svg {
  width: 18px;
  height: 18px;
}
[data-sonner-toast][data-type="success"] .pl-toast-icon > svg {
  color: #10b981;
}
[data-sonner-toast][data-type="error"] .pl-toast-icon > svg {
  color: var(--destructive);
}
[data-sonner-toast][data-type="warning"] .pl-toast-icon > svg {
  color: #f59e0b;
}
[data-sonner-toast][data-type="info"] .pl-toast-icon > svg {
  color: var(--primary);
}

/* Title + description typography. */
[data-sonner-toast] .pl-toast-title {
  font-weight: 500;
  color: var(--foreground);
}
[data-sonner-toast] .pl-toast-description {
  color: var(--muted-foreground);
  margin-top: 2px;
}

/* Action buttons (when toast.success("…", { action: { label, onClick }}) ) */
[data-sonner-toast] .pl-toast-action {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: calc(var(--radius) - 4px);
  font-weight: 500;
  padding: 6px 10px;
  font-size: 12px;
}
[data-sonner-toast] .pl-toast-cancel {
  background: var(--muted);
  color: var(--muted-foreground);
  border-radius: calc(var(--radius) - 4px);
  font-weight: 500;
  padding: 6px 10px;
  font-size: 12px;
}

/* Close-X button (close-button enabled). */
[data-sonner-toast] .pl-toast-close {
  background: var(--card);
  border: 1px solid var(--border);
  color: var(--muted-foreground);
  border-radius: 9999px;
}
[data-sonner-toast] .pl-toast-close:hover {
  color: var(--foreground);
  background: var(--muted);
}
</style>
