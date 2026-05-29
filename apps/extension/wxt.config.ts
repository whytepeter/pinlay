import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// pinlay extension — WXT + Vue 3 + Tailwind v4.
// Capture-only: no recording, no debugger, no tabCapture/offscreen permissions.
// API contract with the dashboard lives in @pinlay/shared.
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-vue", "@wxt-dev/auto-icons"],
  extensionApi: "chrome",
  autoIcons: {
    baseIconPath: "assets/icon.svg",
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "pinlay",
    description:
      "Drop pins on any live web page; triage and ship in your dashboard.",
    version: "0.0.1",
    permissions: ["tabs", "activeTab", "storage", "scripting"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "pinlay — drop a pin",
    },
    externally_connectable: {
      matches: [
        "http://localhost:5173/*",
        "http://localhost:4173/*",
        "https://*.pinlay.app/*",
      ],
    },
    web_accessible_resources: [
      {
        resources: ["icon/*.png"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
