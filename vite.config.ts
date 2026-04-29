import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: "autoUpdate",
    injectRegister: "auto",
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
      cleanupOutdatedCaches: true,
      skipWaiting: true,
      clientsClaim: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "CacheFirst",
          options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
      ],
    },
    includeAssets: ["favicon.svg", "apple-touch-icon.png"],
    manifest: {
      name: "NeuroEye Log",
      short_name: "NeuroEye Log",
      description: "Track dry eye symptoms, pain, and treatments",
      theme_color: "#F0EFF8",
      background_color: "#F0EFF8",
      display: "standalone",
      orientation: "portrait",
      scope: "/",
      start_url: "/",
      icons: [
        { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    },
    devOptions: {
      enabled: true,
      type: "module",
    },
  })],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
