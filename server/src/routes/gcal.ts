import { Hono } from "hono";
import { SyncRequest } from "../../../shared/api";
import type { Db } from "../db/client";
import { env } from "../env";
import * as gcal from "../gcal/google";
import { validJson } from "../validate";

export function gcalRoutes(db: Db) {
  return new Hono()
    .get("/status", async (c) => c.json(await gcal.status(db)))
    .get("/auth", (c) => {
      if (!gcal.isConfigured()) return c.json({ error: "Google credentials missing: see docs/guides/google-calendar-setup.md" }, 400);
      return c.redirect(gcal.authUrl());
    })
    .get("/callback", async (c) => {
      const code = c.req.query("code");
      const back = `http://localhost:${env.appPort}/?gcal=`;
      if (!code) return c.redirect(`${back}error`);
      try {
        await gcal.handleCallback(db, code);
        return c.redirect(`${back}connected`);
      } catch (e) {
        console.error("[gcal] callback failed", e);
        return c.redirect(`${back}error`);
      }
    })
    .post("/disconnect", async (c) => {
      await gcal.disconnect(db);
      return c.json({ ok: true });
    })
    .post("/sync", validJson(SyncRequest), async (c) => {
      const { events, timeZone } = c.req.valid("json");
      try {
        return c.json(await gcal.sync(db, events, timeZone));
      } catch (e) {
        console.error("[gcal] sync failed", e);
        return c.json({ error: e instanceof Error ? e.message : String(e) }, 502);
      }
    });
}
