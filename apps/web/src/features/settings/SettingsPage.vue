<script setup lang="ts">
import { ref } from "vue";
import { Icon, Tabs, TabsList, TabsTrigger } from "@pinlay/design";
import PageHeader from "@/shared/components/PageHeader.vue";
import ProfileSection from "./components/ProfileSection.vue";
import WorkspaceSection from "./components/WorkspaceSection.vue";
import MembersSection from "./components/MembersSection.vue";
import BillingSection from "./components/BillingSection.vue";
import NotificationsSection from "./components/NotificationsSection.vue";
import DangerZoneSection from "./components/DangerZoneSection.vue";

type SectionId =
  | "profile"
  | "workspace"
  | "members"
  | "billing"
  | "notifications"
  | "danger";

const section = ref<SectionId>("profile");

const NAV: { id: SectionId; label: string; icon: string; danger?: boolean }[] =
  [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "workspace", label: "Workspace", icon: "building-2" },
    { id: "members", label: "Members", icon: "users" },
    { id: "billing", label: "Billing", icon: "credit-card" },
    { id: "notifications", label: "Notifications", icon: "bell" },
    {
      id: "danger",
      label: "Danger zone",
      icon: "triangle-alert",
      danger: true,
    },
  ];
</script>

<template>
  <div class="flex min-h-[calc(100dvh-3rem)] flex-col">
    <PageHeader title="Settings" subtitle="Workspace, team, and preferences." />

    <Tabs v-model="section" class="flex flex-1 flex-col md:flex-row md:gap-0">
      <!-- Same TabsList morphs from horizontal strip (mobile) to vertical
           sidebar (md+). The sliding indicator handles either axis via
           translate(x,y). -->
      <TabsList
        class="w-full rounded-none border-b bg-transparent px-3 py-2 [&>[aria-hidden]]:bg-muted [&>[aria-hidden]]:shadow-none md:w-[220px] md:shrink-0 md:flex-col md:items-stretch md:gap-0.5 md:border-b-0 border-t-0 border-l-0 md:border-r md:px-3 md:py-6"
      >
        <TabsTrigger
          v-for="s in NAV"
          :key="s.id"
          :value="s.id"
          :class="[
            s.danger
              ? 'text-destructive/75 hover:text-destructive data-[state=active]:text-destructive data-[state=active]:[&_svg]:text-destructive'
              : '',
            'flex justify-start',
          ]"
        >
          <Icon :name="s.icon" :size="15" />
          {{ s.label }}
        </TabsTrigger>
      </TabsList>

      <!-- section content -->
      <div class="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div class="mx-auto w-full max-w-3xl md:mx-0">
          <ProfileSection v-if="section === 'profile'" />
          <WorkspaceSection v-else-if="section === 'workspace'" />
          <MembersSection v-else-if="section === 'members'" />
          <BillingSection v-else-if="section === 'billing'" />
          <NotificationsSection v-else-if="section === 'notifications'" />
          <DangerZoneSection v-else-if="section === 'danger'" />
        </div>
      </div>
    </Tabs>
  </div>
</template>
