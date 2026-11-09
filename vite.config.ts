import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const dataHost = process.env.VITE_DATA_BASE_URL ?? "";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Mandaat",
        short_name: "Mandaat",
        description: "Een publiek dossier voor elke politicus. Wie ontmoeten ze, wie lobbyt hen, hoe stemmen ze.",
        lang: "nl",
        theme_color: "#F2F4F1",
        background_color: "#F2F4F1",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg}", "pwa-192.png"],
        globIgnores: ["data/**"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/data/") || (dataHost !== "" && url.href.startsWith(dataHost)),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "mandaat-data", expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: { cacheName: "mandaat-fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === "www.europarl.europa.eu" && url.pathname.startsWith("/mepphoto/"),
            handler: "CacheFirst",
            options: { cacheName: "mandaat-photos", expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
});
