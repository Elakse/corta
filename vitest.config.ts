import { defineConfig } from "vitest/config";
import { normalizePath } from "vite";
import { fileURLToPath } from "node:url";

const r = (p: string) => normalizePath(fileURLToPath(new URL(p, import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      "@/": r("./app/src/"),
      "@shared/": r("./shared/"),
      "@content/": r("./content/"),
    },
  },
  test: {
    include: ["app/src/**/*.test.{ts,tsx}", "server/src/**/*.test.ts", "scripts/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
  },
});
