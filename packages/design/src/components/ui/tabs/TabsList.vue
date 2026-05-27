<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"
import type { TabsListProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsList } from "reka-ui"
import { cn } from '@pinlayer/design/lib/utils'

const props = defineProps<TabsListProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

// Sliding active indicator. We watch `data-state` changes on descendant
// triggers (reka-ui marks the active one with data-state="active") and
// translate an absolute div behind it. Resize re-measures. Every Tabs in the
// app inherits this — no per-call-site wiring needed.
const rootRef = ref<any>(null)
const indicatorStyle = ref<Record<string, string>>({ opacity: '0' })
let observer: MutationObserver | null = null

function getEl(): HTMLElement | null {
  const r = rootRef.value
  if (!r) return null
  return (r.$el as HTMLElement | undefined) ?? (r as HTMLElement)
}

function updateIndicator() {
  const root = getEl()
  if (!root) return
  const active = root.querySelector<HTMLElement>('[data-state="active"]')
  if (!active) {
    indicatorStyle.value = { opacity: '0' }
    return
  }
  indicatorStyle.value = {
    width: `${active.offsetWidth}px`,
    height: `${active.offsetHeight}px`,
    transform: `translate(${active.offsetLeft}px, ${active.offsetTop}px)`,
    opacity: '1',
  }
}

onMounted(async () => {
  await nextTick()
  updateIndicator()
  const root = getEl()
  if (root) {
    observer = new MutationObserver(() => {
      requestAnimationFrame(updateIndicator)
    })
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-state'],
      subtree: true,
    })
  }
  window.addEventListener('resize', updateIndicator)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateIndicator)
})
</script>

<template>
  <TabsList
    ref="rootRef"
    data-slot="tabs-list"
    v-bind="delegatedProps"
    :class="cn(
      'bg-muted scrollbar-hide relative inline-flex w-fit shrink-0 items-center gap-1 overflow-auto rounded-lg p-1 text-muted-foreground data-[orientation=vertical]:w-full data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
      props.class,
    )"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-0 top-0 rounded-md bg-background shadow-xs transition-all duration-300 ease-out"
      :style="indicatorStyle"
    />
    <slot />
  </TabsList>
</template>
