<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue"
import type { TabsListProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsList } from "reka-ui"
import { cn } from '@pinlay/design/lib/utils'

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
  // Use getBoundingClientRect for sub-pixel accuracy. offsetTop/Height round to
  // integers, which causes a ~0.5–1px vertical drift on containers with
  // border + odd padding (e.g. the 1px border + 0.5 padding TabsList).
  const rootRect = root.getBoundingClientRect()
  const aRect = active.getBoundingClientRect()
  // Subtract the offsetParent's border (clientTop/Left) so the translate origin
  // lines up with `top: 0`'s padding-edge anchor.
  const x = aRect.left - rootRect.left - root.clientLeft
  const y = aRect.top - rootRect.top - root.clientTop
  indicatorStyle.value = {
    width: `${aRect.width}px`,
    height: `${aRect.height}px`,
    transform: `translate(${x}px, ${y}px)`,
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
      // iOS segmented control: recessed muted track, raised thumb (below).
      'scrollbar-hide relative inline-flex w-fit shrink-0 items-center gap-0.5 overflow-auto rounded-lg border border-transparent bg-muted p-1 text-muted-foreground data-[orientation=vertical]:w-full data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
      props.class,
    )"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-0 top-0 rounded-md bg-background shadow-sm ring-1 ring-black/[0.04] transition-all duration-300 ease-out dark:bg-muted-foreground/20 dark:ring-white/[0.06]"
      :style="indicatorStyle"
    />
    <slot />
  </TabsList>
</template>
