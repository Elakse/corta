import { serve } from "@hono/node-server";
import { env } from "./env";
import { openDb } from "./db/client";
import { createApp } from "./app";

const db = await openDb(env.dbPath);
const app = createApp(db, { log: !process.env.CORTA_E2E });

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Corta API → http://localhost:${info.port}  (db: ${env.dbPath})`);
});
