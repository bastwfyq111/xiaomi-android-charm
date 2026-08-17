// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      allowedHosts: true,
    },
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        filename: "sw.js",
        outDir: ".output/public",
        injectRegister: null,
        devOptions: { enabled: false },
        // public/manifest.json is maintained by hand and linked from the route head.
        manifest: false,
        includeAssets: [
          "favicon.ico",
          "icon-192.png",
          "icon-512.png",
          "Cairo-Regular.ttf",
          "manifest.json",
          "report-letterhead.png",
          "robots.txt",
        ],
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,json}"],
          additionalManifestEntries: [{ url: "/", revision: null }],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              // يقدّم آخر نسخة محفوظة فورًا، ثم يحدّثها في الخلفية عند توفر الشبكة.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "html-navigations",
                plugins: [
                  {
                    // في أول فتح دون اتصال، استخدم نسخة الصفحة التي جرى حفظها أثناء التثبيت.
                    handlerDidError: async ({ request }) => {
                      return (await caches.match(request)) || Response.error();
                    },
                  },
                ],
              },
            },
            {
              // خطوط جوجل: تعمل بدون إنترنت بعد أول تحميل
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.googleapis.com" ||
                url.origin === "https://fonts.gstatic.com",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                ["script", "style", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
          ],
        },
      }),
    ],
  },
});
