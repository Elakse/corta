import { defineConfig, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// normalizePath: forward slashes on Windows too (aliases with backslashes fail to resolve there)
const r = (p: string) => normalizePath(fileURLToPath(new URL(p, import.meta.url)));
const serverPort = Number(process.env.CORTA_PORT ?? 8787);

export default defineConfig({
  root: r("."),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/": r("./src/"),
      "@shared/": r("../shared/"),
      "@content/": r("../content/"),
    },
  },
  server: {
    port: Number(process.env.CORTA_APP_PORT ?? 5173),
    fs: { allow: [r("..")] },
    proxy: { "/api": { target: `http://localhost:${serverPort}`, changeOrigin: true } },
  },
  preview: {
    port: Number(process.env.CORTA_APP_PORT ?? 5173),
    proxy: { "/api": { target: `http://localhost:${serverPort}`, changeOrigin: true } },
  },
  build: { outDir: r("../dist"), emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
