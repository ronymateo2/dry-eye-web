import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["motion/react"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
  plugins: [react(), tailwindcss(), VitePWA({
    strategies: "injectManifest",
    srcDir: "src",
    filename: "sw.ts",
    registerType: "autoUpdate",
    injectRegister: "auto",
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
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
