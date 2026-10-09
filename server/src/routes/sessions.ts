import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { StudySessionInput } from "../../../shared/api";
import type { Db } from "../db/client";
import { studySessions } from "../db/schema";
import { validJson } from "../validate";

const toApi = (r: typeof studySessions.$inferSelect) => ({ ...r });

export function sessionRoutes(db: Db) {
  return new Hono()
    .get("/", async (c) => c.json({ sessions: (await db.select().from(studySessions)).map(toApi) }))
    .post("/", validJson(StudySessionInput), async (c) => {
      const now = new Date().toISOString();
      const row = { ...normalize(c.req.valid("json")), id: randomUUID(), createdAt: now, updatedAt: now };
      await db.insert(studySessions).values(row);
      return c.json(row, 201);
    })
    .put("/:id", validJson(StudySessionInput), async (c) => {
      const id = String(c.req.param("id"));
      const now = new Date().toISOString();
      const res = await db.update(studySessions).set({ ...normalize(c.req.valid("json")), updatedAt: now }).where(eq(studySessions.id, id)).returning();
      if (!res[0]) return c.json({ error: "not found" }, 404);
      return c.json(toApi(res[0]));
    })
    .delete("/:id", async (c) => {
      await db.delete(studySessions).where(eq(studySessions.id, c.req.param("id")));
      return c.json({ ok: true });
    });
}

function normalize(s: StudySessionInput) {
  return { ...s, evaluationKey: s.evaluationKey ?? null, topicId: s.topicId ?? null, goal: s.goal ?? null, done: s.done ?? false };
}
