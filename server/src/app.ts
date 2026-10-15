import { Hono } from "hono";
import { logger } from "hono/logger";
import type { Db } from "./db/client";
import { progressRoutes } from "./routes/progress";
import { settingsRoutes } from "./routes/settings";
import { sessionRoutes } from "./routes/sessions";
import { annotationRoutes } from "./routes/annotations";
import { gcalRoutes } from "./routes/gcal";
import { llmRoutes } from "./routes/llm";
import { sourceRoutes } from "./routes/sources";
import { env } from "./env";

/** Builds the API (separate from the listener so tests can call it in-process). */
export function createApp(db: Db, opts: { log?: boolean; contentRoots?: string[] } = {}) {
  const app = new Hono();
  if (opts.log) app.use("*", logger());
  return app
    .get("/api/health", (c) => c.json({ ok: true }))
    .route("/api/progress", progressRoutes(db))
    .route("/api/settings", settingsRoutes(db))
    .route("/api/sessions", sessionRoutes(db))
    .route("/api/annotations", annotationRoutes(db))
    .route("/api/gcal", gcalRoutes(db))
    .route("/api/llm", llmRoutes(db))
    .route("/api/sources", sourceRoutes(opts.contentRoots ?? env.contentRoots));
}
