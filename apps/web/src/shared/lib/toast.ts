/**
 * Thin wrapper over vue-sonner so the rest of the app imports one path.
 *
 * Usage:
 *   import { toast } from "@/shared/lib/toast";
 *   toast.success("Saved");
 *   toast.error("Couldn't switch workspace.");
 *   toast.error(err);  // accepts unknown — extracts .message safely
 */
import { toast as sonner, type ExternalToast } from "vue-sonner";

function messageOf(err: unknown, fallback: string): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
}

export const toast = {
  success(message: string, opts?: ExternalToast) {
    return sonner.success(message, opts);
  },
  info(message: string, opts?: ExternalToast) {
    return sonner.info(message, opts);
  },
  warn(message: string, opts?: ExternalToast) {
    return sonner.warning(message, opts);
  },
  error(input: unknown, opts?: ExternalToast) {
    const msg =
      typeof input === "string"
        ? input
        : messageOf(input, "Something went wrong.");
    return sonner.error(msg, opts);
  },
  message(message: string, opts?: ExternalToast) {
    return sonner(message, opts);
  },
};
