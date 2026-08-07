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
        injectRegister: null,
        devOptions: { enabled: false },
        // public/manifest.json is maintained by hand and linked from the route head.
        manifest: false,
        includeAssets: ["icon-192.png", "icon-512.png", "Cairo-Regular.ttf", "manifest.json"],
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,ttf}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-navigations",
                networkTimeoutSeconds: 5,
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
