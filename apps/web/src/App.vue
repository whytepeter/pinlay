<script setup lang="ts">
import { Toaster } from "vue-sonner";
import ConfirmDialog from "@/shared/components/ConfirmDialog.vue";
</script>

<template>
  <RouterView />
  <!-- Singleton confirm dialog — drives all `await confirm({...})` calls. -->
  <ConfirmDialog />
  <!-- iOS banner style (2026-07-12): drops from top-center as a frosted
       capsule. Type is conveyed by the tinted icon, not a colored bar. -->
  <Toaster
    position="top-center"
    :offset="12"
    :gap="8"
    :duration="4000"
    :visible-toasts="3"
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
/* Sits above sticky bars + overlays. */
[data-sonner-toaster] {
  z-index: 2147483600;
  --width: 340px;
}

/* ── iOS banner capsule ──────────────────────────────────────────────────
   Frosted translucent surface, full-radius, soft depth. Semantic type is
   the icon tint (below), not chrome. */
[data-sonner-toast].pl-toast {
  background: color-mix(in oklab, var(--card) 85%, transparent);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  color: var(--foreground);
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 9999px;
  box-shadow:
    0 12px 32px -8px color-mix(in oklab, var(--foreground) 22%, transparent),
    0 2px 6px -2px color-mix(in oklab, var(--foreground) 10%, transparent);
  padding: 10px 18px;
  font-size: 13px;
  line-height: 1.4;
  align-items: center;
}

/* Icon sizing & per-type tint — matches the app's status palette. */
[data-sonner-toast] .pl-toast-icon {
  margin: 0;
}
[data-sonner-toast] .pl-toast-icon > svg {
  width: 17px;
  height: 17px;
}
[data-sonner-toast][data-type="success"] .pl-toast-icon > svg {
  color: var(--status-resolved, #10b981);
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
  margin-top: 1px;
}

/* Action buttons (when toast.success("…", { action: { label, onClick }}) ) */
[data-sonner-toast] .pl-toast-action {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 9999px;
  font-weight: 500;
  padding: 6px 12px;
  font-size: 12px;
}
[data-sonner-toast] .pl-toast-cancel {
  background: var(--muted);
  color: var(--muted-foreground);
  border-radius: 9999px;
  font-weight: 500;
  padding: 6px 12px;
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
