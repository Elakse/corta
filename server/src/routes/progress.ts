import { Hono } from "hono";
import { desc, eq, inArray } from "drizzle-orm";
import { ProgressChange } from "../../../shared/api";
import type { Db } from "../db/client";
import { progress, progressEvents } from "../db/schema";
import { validJson } from "../validate";

export function progressRoutes(db: Db) {
  return new Hono()
    .get("/", async (c) => {
      const rows = await db.select({ nodeId: progress.nodeId }).from(progress).where(eq(progress.done, true));
      return c.json({ done: rows.map((r) => r.nodeId) });
    })
    .post("/", validJson(ProgressChange), async (c) => {
      const { set, unset } = c.req.valid("json");
      const at = new Date().toISOString();
      await db.transaction(async (tx) => {
        for (const nodeId of set)
          await tx.insert(progress).values({ nodeId, done: true, updatedAt: at }).onConflictDoUpdate({ target: progress.nodeId, set: { done: true, updatedAt: at } });
        if (unset.length) await tx.delete(progress).where(inArray(progress.nodeId, unset));
        const events = [...set.map((nodeId) => ({ nodeId, done: true, at })), ...unset.map((nodeId) => ({ nodeId, done: false, at }))];
        if (events.length) await tx.insert(progressEvents).values(events);
      });
      return c.json({ ok: true });
    })
    .get("/events", async (c) => {
      const limit = Math.min(5000, Number(c.req.query("limit") ?? 500));
      const rows = await db.select().from(progressEvents).orderBy(desc(progressEvents.id)).limit(limit);
      return c.json({ events: rows.map((r) => ({ nodeId: r.nodeId, done: r.done, at: r.at })) });
    });
}
