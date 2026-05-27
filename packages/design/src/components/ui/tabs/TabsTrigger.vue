<script setup lang="ts">
import type { TabsTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsTrigger, useForwardProps } from "reka-ui"
import { cn } from '@pinlay/design/lib/utils'

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
const forwardedProps = useForwardProps(delegatedProps)

// Auto-center the clicked trigger inside a scrollable TabsList (the strip will
// scroll horizontally on mobile when there are many tabs). No-op when the list
// already fits — scrollIntoView only moves if needed.
function onClick(e: MouseEvent) {
  ;(e.currentTarget as HTMLElement)?.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  })
}
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :class="cn(
      'relative z-[1] inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:text-foreground data-[state=active]:[&_svg]:text-primary',
      'data-[orientation=vertical]:justify-start',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
      props.class,
    )"
    v-bind="forwardedProps"
    @click="onClick"
  >
    <slot />
  </TabsTrigger>
</template>
