import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "@/shared/composables/useAuth";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public marketing routes (no app shell) ─────────────────────────────
    {
      // The landing page. Signed-out visitors hitting `/` are sent here
      // (see guard below); signed-in users hitting it are bounced to the app.
      path: "/welcome",
      name: "landing",
      component: () => import("@/features/landing/LandingPage.vue"),
      meta: { public: true },
    },
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
          // The Pin Inbox — the dashboard's home (2026-07-10 rebuild).
          path: "",
          name: "pins",
          component: () => import("@/features/pins/PinsPage.vue"),
        },
        {
          // Tab lives in the URL (`/settings/profile`, `/settings/team`, …).
          // Bare `/settings` redirects to Profile so old links still work.
          path: "settings/:section?",
          name: "settings",
          component: () => import("@/features/settings/SettingsPage.vue"),
        },
        {
          path: "settings",
          redirect: { name: "settings", params: { section: "profile" } },
        },
        // Pin detail — the only detail surface. Own back-header; AppLayout
        // hides the navbar on /p/*.
        {
          path: "p/:pinId",
          name: "pin",
          component: () => import("@/features/pins/PinDetailPage.vue"),
        },
        // Legacy issue links forward to the first pin.
        {
          path: "s/:id",
          name: "issue-redirect",
          component: () => import("@/features/pins/SessionRedirect.vue"),
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
    // The bare app root greets signed-out visitors with the landing page;
    // deep links (a shared /p/:id, /connect-extension) still go through
    // login so the redirect survives.
    if (to.name === "pins" && to.fullPath === "/") {
      return { name: "landing" };
    }
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (
    isAuthenticated.value &&
    (to.name === "login" || to.name === "signup" || to.name === "landing")
  ) {
    const r = to.query.redirect;
    const target = Array.isArray(r) ? r[0] : r;
    return typeof target === "string" && target.startsWith("/")
      ? target
      : { path: "/" };
  }
  return true;
});
