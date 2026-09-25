import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";

import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    host: true,
    allowedHosts: [
      "application-programmers-coast-lee.trycloudflare.com",
    ],
  },

  preview: {
    port: 4173,
  },
});