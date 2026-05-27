import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("@/features/workspace-shell/AppLayout.vue"),
      children: [
        {
          path: "",
          name: "pinboards",
          component: () => import("@/features/pinboards/PinboardsPage.vue"),
        },
        {
          path: "overview",
          name: "dashboard",
          component: () => import("@/features/dashboard/DashboardPage.vue"),
        },
        {
          path: "integrations",
          name: "integrations",
          component: () => import("@/features/integrations/IntegrationsPage.vue"),
        },
        {
          path: "settings",
          name: "settings",
          component: () => import("@/features/settings/SettingsPage.vue"),
        },
        // Issue detail — inside the shell (sidebar visible), own header instead
        // of the StatusBar (AppLayout hides StatusBar on /s/*).
        {
          path: "s/:id",
          name: "issue",
          component: () => import("@/features/issue/IssuePage.vue"),
        },
      ],
    },
    // Standalone design references (no app shell)
    {
      path: "/gallery",
      name: "gallery",
      component: () => import("@/pages/HomeView.vue"),
    },
    {
      path: "/palette",
      name: "palette",
      component: () => import("@/pages/PaletteView.vue"),
    },
  ],
});
