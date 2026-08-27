import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const capacitorPwaRegisterStub = (): Plugin => ({
  name: "capacitor-pwa-register-stub",
  resolveId(id) {
    return id === "virtual:pwa-register" ? "\0capacitor-pwa-register" : undefined;
  },
  load(id) {
    if (id !== "\0capacitor-pwa-register") return undefined;
    return `export const registerSW = async () => () => {};`;
  },
});

export default defineConfig({
  plugins: [capacitorPwaRegisterStub(), tsconfigPaths(), react(), tailwindcss()],
  base: "/",
  worker: {
    format: "es",
  },
  build: {
    outDir: ".capacitor-web",
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: resolve(process.cwd(), "capacitor.html"),
    },
  },
});
