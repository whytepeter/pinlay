import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@ui": fileURLToPath(new URL("../../packages/design/src", import.meta.url)),
    },
  },
  server: {
    // fsevents misses some file writes on this machine (edits made by
    // external tools never trigger HMR); polling is the reliable fallback.
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      // The API mounts every route under `/api` (NestJS setGlobalPrefix), so
      // forward the prefix as-is — do NOT strip it.
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
