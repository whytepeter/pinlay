<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@pinlay/design";
import Favicon from "@/shared/components/Favicon.vue";
import { useIssue } from "./composables/useIssue";
import PinList from "./components/PinList.vue";
import PinDetail from "./components/PinDetail.vue";

const route = useRoute();
const sessionId = computed(() => String(route.params.id));
const {
  session,
  pins,
  selectedIndex,
  selected,
  select,
  next,
  prev,
  setStatus,
  setAssignee,
} = useIssue(sessionId);

const mobilePane = ref<"list" | "detail">("list");
function onSelect(i: number) {
  select(i);
  mobilePane.value = "detail";
}

function copyLink() {
  try {
    navigator.clipboard?.writeText(window.location.href);
  } catch {
    /* clipboard unavailable */
  }
}
function openOnPage() {
  if (session.value) window.open(session.value.pageUrl, "_blank", "noopener");
}
</script>

<template>
  <div class="flex h-screen flex-col bg-background text-foreground">
    <!-- header -->
    <header class="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <RouterLink to="/">
        <Button variant="ghost" size="sm">
          <Icon name="arrow-left" :size="14" /> Issues
        </Button>
      </RouterLink>
      <Icon
        name="chevron-right"
        :size="14"
        class="hide-mobile text-muted-foreground"
      />
      <span class="hide-mobile font-mono text-xs text-muted-foreground">{{
        session?.shortId
      }}</span>

      <div class="flex min-w-0 flex-1 items-center gap-1.5">
        <Favicon
          v-if="session"
          :label="session.faviconLabel"
          :hue="session.faviconHue"
          :size="15"
        />
        <span class="truncate text-sm font-medium">{{ session?.title }}</span>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- desktop secondary actions -->
        <Button
          variant="ghost"
          size="sm"
          class="hidden md:inline-flex"
          @click="copyLink"
        >
          <Icon name="link" :size="14" /> Copy link
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="hidden md:inline-flex"
          title="Open the synced Linear issue (coming soon)"
        >
          <Icon name="external-link" :size="14" /> View in Linear
        </Button>

        <!-- mobile overflow for the secondary actions -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="md:hidden" title="More">
              <Icon name="ellipsis" :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="copyLink"
              ><Icon name="link" :size="14" /> Copy link</DropdownMenuItem
            >
            <DropdownMenuItem
              ><Icon name="external-link" :size="14" /> View in Linear</DropdownMenuItem
            >
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" @click="openOnPage">
          <Icon name="square-arrow-out-up-right" :size="14" />
          <span class="hide-mobile">Open on page</span>
        </Button>
      </div>
    </header>

    <!-- mobile pane switcher -->
    <Tabs v-model="mobilePane" class="border-b px-3 py-2 md:hidden">
      <TabsList class="w-full">
        <TabsTrigger value="list" class="flex-1">Pins</TabsTrigger>
        <TabsTrigger value="detail" class="flex-1">Detail</TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- body -->
    <div v-if="session && selected" class="flex min-h-0 flex-1">
      <div
        class="w-full shrink-0 flex-col border-r md:flex md:w-[340px]"
        :class="mobilePane === 'list' ? 'flex' : 'hidden'"
      >
        <PinList
          :session="session"
          :pins="pins"
          :selected-index="selectedIndex"
          @select="onSelect"
        />
      </div>
      <div
        class="min-w-0 flex-1 flex-col md:flex"
        :class="mobilePane === 'detail' ? 'flex' : 'hidden'"
      >
        <PinDetail
          :pin="selected"
          :index="selectedIndex"
          :total="pins.length"
          @next="next"
          @prev="prev"
          @set-status="setStatus"
          @set-assignee="setAssignee"
        />
      </div>
    </div>
    <div
      v-else
      class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
    >
      Session not found.
    </div>
  </div>
</template>
