<script setup lang="ts">
/**
 * "Send feedback" — feedback about pinlay itself, opened from the navbar
 * account menu.
 *
 * Note the naming hazard this sits next to: a *pin* is feedback about the
 * customer's own site, while this is feedback about pinlay. The copy leans on
 * "pinlay" explicitly so the two never get confused.
 *
 * The current route is submitted alongside the message so a report like "this
 * is broken" is still actionable without a follow-up email.
 */
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Icon,
  Textarea,
} from "@pinlay/design";
import { apiClient, type FeedbackKind } from "@/shared/lib/api";
import { toast } from "@/shared/lib/toast";

const open = defineModel<boolean>("open", { required: true });

const route = useRoute();

const KINDS: { id: FeedbackKind; label: string; icon: string }[] = [
  { id: "bug", label: "Bug", icon: "bug" },
  { id: "idea", label: "Idea", icon: "lightbulb" },
  { id: "question", label: "Question", icon: "circle-help" },
];

const kind = ref<FeedbackKind>("bug");
const message = ref("");
const submitting = ref(false);

const MAX = 5000;
const canSubmit = computed(
  () => message.value.trim().length > 0 && message.value.length <= MAX,
);

// Reset on close so the next open is a clean slate — a half-written report
// reappearing days later reads as a bug.
watch(open, (isOpen) => {
  if (!isOpen) {
    message.value = "";
    kind.value = "bug";
    submitting.value = false;
  }
});

async function submit() {
  if (!canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    await apiClient.feedback.create({
      message: message.value.trim(),
      kind: kind.value,
      path: route.fullPath,
    });
    open.value = false;
    toast.success("Thanks — we got it.");
  } catch (err) {
    // Keep the dialog open and the text intact so nothing they typed is lost.
    toast.error(err);
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle>Send feedback</DialogTitle>
        <DialogDescription>
          Tell us what's working, what isn't, or what you wish pinlay did.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex gap-2">
          <button
            v-for="k in KINDS"
            :key="k.id"
            type="button"
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] transition-colors"
            :class="
              kind === k.id
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            "
            :aria-pressed="kind === k.id"
            @click="kind = k.id"
          >
            <Icon :name="k.icon" :size="14" />
            {{ k.label }}
          </button>
        </div>

        <div class="flex flex-col gap-1.5">
          <Textarea
            v-model="message"
            :maxlength="MAX"
            rows="5"
            autofocus
            placeholder="What happened? The more specific, the faster we can fix it."
            @keydown.meta.enter="submit"
            @keydown.ctrl.enter="submit"
          />
          <p class="text-[11px] text-muted-foreground">
            We'll include the page you're on ({{ route.fullPath }}) so we can
            reproduce it.
          </p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" @click="open = false">Cancel</Button>
        <Button size="sm" :disabled="!canSubmit || submitting" @click="submit">
          <Icon v-if="!submitting" name="send" :size="14" />
          {{ submitting ? "Sending…" : "Send feedback" }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
