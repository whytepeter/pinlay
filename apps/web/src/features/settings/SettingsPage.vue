<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Icon, Tabs, TabsList, TabsTrigger } from "@pinlay/design";
import ProfileSection from "./components/ProfileSection.vue";
import WorkspaceSection from "./components/WorkspaceSection.vue";
import MembersSection from "./components/MembersSection.vue";
import DangerZoneSection from "./components/DangerZoneSection.vue";

// Billing + Notifications tabs were removed in the 2026-07-10 rebuild —
// their backends don't exist yet, and we don't ship mock UI (see ROADMAP.md
// "Product principles"). They return with Phase 6/7. "Team" merges the old
// Workspace + Members tabs: name your workspace and manage who's in it are
// one job, not two.
type SectionId = "profile" | "team" | "danger";

const SECTIONS: SectionId[] = ["profile", "team", "danger"];

/** Old deep links (`/settings/workspace`, `/settings/members`) → Team. */
const LEGACY_ALIASES: Record<string, SectionId> = {
  workspace: "team",
  members: "team",
};

const route = useRoute();
const router = useRouter();

// Section lives in the URL path (`/settings/profile`, `/settings/workspace`,
// …) so each tab is deep-linkable + bookmarkable. The router redirects bare
// `/settings` to `/settings/profile`; an unknown slug normalises here.
function paramOf(value: unknown): SectionId | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v === "string" && v in LEGACY_ALIASES) return LEGACY_ALIASES[v]!;
  return SECTIONS.includes(v as SectionId) ? (v as SectionId) : null;
}

const section = computed<SectionId>({
  get() {
    return paramOf(route.params.section) ?? "profile";
  },
  set(next) {
    if (next === section.value) return;
    void router.replace({
      name: "settings",
      params: { section: next },
    });
  },
});

// If the URL carries an unknown section (typo, stale link), rewrite it to
// /settings/profile so the visible tab and the URL agree.
watch(
  () => route.params.section,
  (raw) => {
    if (paramOf(raw) === null) {
      void router.replace({
        name: "settings",
        params: { section: "profile" },
      });
    }
  },
  { immediate: true },
);

const NAV: { id: SectionId; label: string; icon: string; danger?: boolean }[] =
  [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "team", label: "Team", icon: "users" },
    {
      id: "danger",
      label: "Danger zone",
      icon: "triangle-alert",
      danger: true,
    },
  ];
</script>

<template>
  <!-- Same centered column as the Pins inbox (max-w-3xl) — the old vertical
       tab rail + edge-to-edge header read as desktop-app chrome. -->
  <div
    class="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6"
    style="padding-bottom: calc(2.5rem + env(safe-area-inset-bottom))"
  >
    <div class="mb-5">
      <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
      <p class="mt-0.5 text-sm text-muted-foreground">
        Workspace, team, and preferences.
      </p>
    </div>

    <Tabs v-model="section" class="flex flex-col gap-6">
      <TabsList class="rounded-full">
        <TabsTrigger
          v-for="s in NAV"
          :key="s.id"
          :value="s.id"
          class="rounded-full px-4"
          :class="
            s.danger
              ? 'text-destructive/75 hover:text-destructive data-[state=active]:text-destructive data-[state=active]:[&_svg]:text-destructive'
              : ''
          "
        >
          <Icon :name="s.icon" :size="15" />
          {{ s.label }}
        </TabsTrigger>
      </TabsList>

      <!-- section content -->
      <div class="min-w-0">
        <ProfileSection v-if="section === 'profile'" />
        <!-- Team = workspace identity + the people in it, stacked. -->
        <template v-else-if="section === 'team'">
          <WorkspaceSection />
          <div class="my-8 border-t" />
          <MembersSection />
        </template>
        <DangerZoneSection v-else-if="section === 'danger'" />
      </div>
    </Tabs>
  </div>
</template>
