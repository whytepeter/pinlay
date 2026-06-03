import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import { router } from "./app/router";
import { initTheme } from "./shared/composables/useTheme";
import { hydrateAuth } from "./shared/composables/useAuth";
import { queryClient } from "./shared/lib/query-client";
import "./assets/main.css";
import "@pinlay/design/tokens.css";
import "vue-sonner/style.css";

initTheme();
// Restore any persisted session before mount so the router guard sees a stable
// auth state on the very first navigation (no login flicker).
hydrateAuth();

createApp(App)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount("#app");
