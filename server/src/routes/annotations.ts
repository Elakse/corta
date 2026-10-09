import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { annotations } from "../db/schema";
import { validJson } from "../validate";

/** Personal notes per node (UI for them is still an open design question; the API is ready). */
export function annotationRoutes(db: Db) {
  return new Hono()
    .get("/", async (c) => c.json({ annotations: await db.select().from(annotations) }))
    .put("/:nodeId{.+}", validJson(z.object({ text: z.string().max(5000) })), async (c) => {
      const nodeId = String(c.req.param("nodeId"));
      const { text } = c.req.valid("json");
      const updatedAt = new Date().toISOString();
      if (!text.trim()) await db.delete(annotations).where(eq(annotations.nodeId, nodeId));
      else await db.insert(annotations).values({ nodeId, text, updatedAt }).onConflictDoUpdate({ target: annotations.nodeId, set: { text, updatedAt } });
      return c.json({ ok: true });
    });
}
