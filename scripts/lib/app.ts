/** Loads app modules in Node through Vite's SSR module loader (supports import.meta.glob, aliases, TSX). */
import { createServer, type ViteDevServer } from "vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export type NodeEntry = typeof import("../../app/src/node-entry");

export async function withApp<T>(fn: (app: NodeEntry) => Promise<T> | T): Promise<T> {
  let server: ViteDevServer | undefined;
  try {
    server = await createServer({
      configFile: resolve(ROOT, "app/vite.config.ts"),
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: "custom",
      logLevel: "error",
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const mod = (await server.ssrLoadModule("/src/node-entry.ts")) as NodeEntry;
    return await fn(mod);
  } finally {
    await server?.close();
  }
}
