<script setup lang="ts">
/**
 * A live demo pin — marker + thread popover — anchored to a real element of
 * the faux-browser mock page on the landing hero. Parent owns open/resolved
 * state; this renders one pin and emits intent.
 */
import { Icon, UserAvatar } from "@pinlay/design";

export interface LandingPin {
  id: number;
  author: string;
  hue: number;
  time: string;
  comment: string;
  resolved: boolean;
  /** Which side the thread popover opens toward. */
  side: "left" | "right";
}

defineProps<{
  pin: LandingPin;
  open: boolean;
}>();

defineEmits<{
  toggle: [];
  resolve: [];
}>();
</script>

<template>
  <button
    type="button"
    class="demo-pin absolute z-10 cursor-pointer border-0 bg-transparent p-0"
    :aria-label="pin.resolved ? 'Resolved pin' : `Open pin ${pin.id}`"
    @click.stop="$emit('toggle')"
  >
    <span
      class="flex size-8 items-center justify-center rounded-full text-[13px] font-semibold ring-[3px] ring-card transition-all"
      :class="
        pin.resolved
          ? 'bg-status-resolved text-white shadow-[0_4px_14px_color-mix(in_oklab,var(--status-resolved)_45%,transparent)]'
          : 'bg-primary text-primary-foreground shadow-[0_6px_18px_color-mix(in_oklab,var(--primary)_50%,transparent)] hover:scale-110'
      "
    >
      <Icon v-if="pin.resolved" name="check" :size="14" :stroke-width="2.5" />
      <template v-else>{{ pin.id }}</template>
    </span>

    <Transition name="thread">
      <div
        v-if="open && !pin.resolved"
        class="absolute top-10 z-20 w-64 max-w-[calc(100vw-3rem)] cursor-default rounded-2xl border border-border bg-popover p-3.5 text-left shadow-[0_16px_40px_-12px_color-mix(in_oklab,var(--foreground)_35%,transparent)] ring-1 ring-black/5"
        :class="pin.side === 'left' ? 'right-0' : 'left-0'"
        @click.stop
      >
        <div class="flex items-center gap-2">
          <UserAvatar :name="pin.author" :hue="pin.hue" :size="20" />
          <span class="text-[12px] font-semibold text-foreground">{{ pin.author }}</span>
          <span class="text-[11px] text-muted-foreground">{{ pin.time }}</span>
        </div>
        <p class="mt-2 text-[13px] font-normal leading-snug text-foreground">
          {{ pin.comment }}
        </p>
        <span
          role="button"
          tabindex="0"
          class="mt-3 inline-flex min-h-[32px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary/10 px-3 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/15"
          @click="$emit('resolve')"
          @keydown.enter="$emit('resolve')"
        >
          <Icon name="check" :size="13" /> Resolve
        </span>
      </div>
    </Transition>
  </button>
</template>

<style scoped>
/* Idle bob so the pins read as alive without stealing focus. */
.demo-pin {
  animation: demo-pin-float 6s ease-in-out infinite;
}
@keyframes demo-pin-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .demo-pin {
    animation: none;
  }
}

/* Thread popover enter/leave. */
.thread-enter-active,
.thread-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.thread-enter-from,
.thread-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
