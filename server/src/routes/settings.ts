import { Hono } from "hono";
import { SettingValue } from "../../../shared/api";
import type { Db } from "../db/client";
import { settings } from "../db/schema";
import { getSetting, setSetting } from "../db/settings";
import { validJson } from "../validate";

/** Key/value user settings (paper type per evaluation, theme, locale, priority strategy…). Keys starting with "secret." are never exposed. */
export function settingsRoutes(db: Db) {
  return new Hono()
    .get("/", async (c) => {
      const rows = await db.select().from(settings);
      const out: Record<string, unknown> = {};
      for (const r of rows) if (!r.key.startsWith("secret.")) out[r.key] = JSON.parse(r.value);
      return c.json(out);
    })
    .get("/:key", async (c) => {
      const key = String(c.req.param("key"));
      if (key.startsWith("secret.")) return c.json({ error: "forbidden" }, 403);
      return c.json({ value: (await getSetting(db, key)) ?? null });
    })
    .put("/:key", validJson(SettingValue), async (c) => {
      const key = String(c.req.param("key"));
      if (key.startsWith("secret.")) return c.json({ error: "forbidden" }, 403);
      await setSetting(db, key, c.req.valid("json").value);
      return c.json({ ok: true });
    });
}
