import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/shared/composables/useAuth";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public auth routes (no app shell) ──────────────────────────────────
    {
      path: "/login",
      name: "login",
      component: () => import("@/features/auth/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/signup",
      name: "signup",
      component: () => import("@/features/auth/SignupView.vue"),
      meta: { public: true },
    },
    {
      // Workspace invite accept page. Public — anyone with the token can
      // preview the invite. Accepting branches on auth state (see view).
      path: "/invite/:token",
      name: "invite",
      component: () => import("@/features/auth/AcceptInviteView.vue"),
      meta: { public: true },
    },
    {
      // Reached from the extension popup's "Connect". Requires auth: the guard
      // bounces unauthed users to /login?redirect=/connect-extension, and they
      // land back here after signing in.
      path: "/connect-extension",
      name: "connect-extension",
      component: () => import("@/features/auth/ConnectExtensionView.vue"),
    },
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
          // Tab lives in the URL (`/settings/profile`, `/settings/workspace`,
          // …). Bare `/settings` redirects to Profile so old links still work.
          path: "settings/:section?",
          name: "settings",
          component: () => import("@/features/settings/SettingsPage.vue"),
        },
        {
          path: "settings",
          redirect: { name: "settings", params: { section: "profile" } },
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
    // Standalone design references (no app shell, internal tools)
    {
      path: "/gallery",
      name: "gallery",
      component: () => import("@/pages/HomeView.vue"),
      meta: { public: true },
    },
    {
      path: "/palette",
      name: "palette",
      component: () => import("@/pages/PaletteView.vue"),
      meta: { public: true },
    },
  ],
});

// Auth guard. Routes flagged `meta.public` are always reachable. Every other
// route requires a session; unauthed users are sent to /login carrying a
// `redirect` back to where they were headed (e.g. /connect-extension). An
// authed user hitting /login or /signup is bounced to the app.
router.beforeEach((to) => {
  const { isAuthenticated } = useAuth();
  const isPublic = to.meta.public === true;

  if (!isAuthenticated.value && !isPublic) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (isAuthenticated.value && (to.name === "login" || to.name === "signup")) {
    const r = to.query.redirect;
    const target = Array.isArray(r) ? r[0] : r;
    return typeof target === "string" && target.startsWith("/")
      ? target
      : { path: "/" };
  }
  return true;
});
