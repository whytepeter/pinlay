<script setup lang="ts">
import { ref } from "vue";
import { Button, Icon, Textarea } from "@pinlay/design";
import UserAvatar from "@/shared/components/UserAvatar.vue";

const text = ref("");
</script>

<template>
  <div class="flex gap-3">
    <UserAvatar class="mt-1 shrink-0" name="Bright Eze" :hue="262" :size="28" />
    <div class="flex-1 overflow-hidden rounded-lg border bg-card">
      <Textarea
        v-model="text"
        placeholder="Reply, mention @teammates…"
        class="min-h-[68px] resize-none rounded-none border-0 bg-transparent focus-visible:ring-0"
      />
      <div class="flex items-center gap-1 border-t px-2 py-1.5">
        <Button variant="ghost" size="icon-sm" title="Attach">
          <Icon name="paperclip" :size="15" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Mention">
          <Icon name="at-sign" :size="15" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Code">
          <Icon name="code" :size="15" />
        </Button>
        <span class="ml-auto text-[11px] text-muted-foreground"
          >Markdown supported · ⌘↵ to send</span
        >
        <Button size="sm" :disabled="!text.trim()">Send</Button>
      </div>
    </div>
  </div>
</template>
