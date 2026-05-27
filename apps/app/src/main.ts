import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./app/router";
import { initTheme } from "./shared/composables/useTheme";
import "./assets/main.css";
import "@pinlayer/design/tokens.css";

initTheme();

createApp(App).use(router).mount("#app");
