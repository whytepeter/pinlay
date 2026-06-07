/**
 * Promise-based confirm dialog with optional async action.
 *
 * Two usage styles:
 *
 *   // (a) Pure yes/no — resolves the moment the user clicks a button.
 *   if (!(await confirm({ title: "Sure?", message: "..." }))) return;
 *   doTheThing();
 *
 *   // (b) Async action — dialog STAYS OPEN with the confirm button in a
 *   //     loading state while `onConfirm` runs. Closes on success.
 *   //     Errors are re-thrown so the caller can toast them, AND the
 *   //     dialog stays open so the user can retry.
 *   await confirm({
 *     title: "Revoke invite?",
 *     message: `Revoke the invite to ${email}?`,
 *     confirmLabel: "Revoke",
 *     variant: "destructive",
 *     onConfirm: () => revokeMutation.mutateAsync(inv.id),
 *   });
 *
 * Mechanism: a singleton reactive `confirmState` ref is read by the global
 * `<ConfirmDialog>` mounted in App.vue. Multiple concurrent confirms are
 * not supported — opening a new one cancels any in-flight one.
 */
import { ref } from "vue";

export type ConfirmVariant = "default" | "destructive";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /**
   * If provided, the dialog stays open while this runs and the confirm
   * button shows a spinner. On resolve → dialog closes + confirm() returns
   * true. On reject → dialog stays open with an inline retry hint; the
   * caller's mutation `onError` handles user-facing error (toast).
   * `confirm()` never rejects; it resolves false if the user cancels.
   */
  onConfirm?: () => Promise<unknown> | unknown;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: ConfirmVariant;
  /** Spinner state on the confirm button. */
  loading: boolean;
  /** Last error message — shown above the buttons when set. */
  error: string | null;
  resolve: ((v: boolean) => void) | null;
  onConfirm: (() => Promise<unknown> | unknown) | null;
}

export const confirmState = ref<ConfirmState>({
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "default",
  loading: false,
  error: null,
  resolve: null,
  onConfirm: null,
});

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  // Cancel any in-flight confirm (treat as "no").
  if (confirmState.value.resolve) {
    confirmState.value.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    confirmState.value = {
      open: true,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? "Confirm",
      cancelLabel: opts.cancelLabel ?? "Cancel",
      variant: opts.variant ?? "default",
      loading: false,
      error: null,
      resolve,
      onConfirm: opts.onConfirm ?? null,
    };
  });
}

/**
 * User clicked Cancel / Esc / overlay. No-op while a loading action is in
 * flight — letting the user cancel a destructive mutation half-way would
 * leave the UI and server out of sync.
 */
export function cancelConfirm() {
  if (confirmState.value.loading) return;
  const r = confirmState.value.resolve;
  confirmState.value.open = false;
  confirmState.value.resolve = null;
  confirmState.value.onConfirm = null;
  if (r) r(false);
}

/**
 * User clicked the confirm button.
 *   • No `onConfirm` → close immediately, resolve(true).
 *   • With `onConfirm` → run it with the dialog open + button spinning.
 *       success: close, resolve(true)
 *       failure: stay open, show inline retry hint, button re-enables.
 *                The caller's mutation `onError` (toast) handles the
 *                user-facing error. `confirm()` itself never rejects.
 */
export async function acceptConfirm() {
  if (confirmState.value.loading) return;
  const action = confirmState.value.onConfirm;
  if (!action) {
    const r = confirmState.value.resolve;
    confirmState.value.open = false;
    confirmState.value.resolve = null;
    if (r) r(true);
    return;
  }

  confirmState.value.loading = true;
  confirmState.value.error = null;
  try {
    await action();
    const r = confirmState.value.resolve;
    confirmState.value.open = false;
    confirmState.value.loading = false;
    confirmState.value.resolve = null;
    confirmState.value.onConfirm = null;
    if (r) r(true);
  } catch (err) {
    confirmState.value.loading = false;
    confirmState.value.error =
      (err as { message?: string })?.message ||
      "Something went wrong. Try again.";
    // Stay open with the same resolve + onConfirm armed — clicking Confirm
    // again re-runs the action. Cancel resolves false as usual.
  }
}
