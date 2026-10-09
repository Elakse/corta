/** User state only. Content lives in files; rows link to it by stable node / entity ids. */
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/** Each node's own learned flag (containers are never stored; complete/partial are derived). */
export const progress = sqliteTable("progress", {
  nodeId: text("node_id").primaryKey(),
  done: integer("done", { mode: "boolean" }).notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Append-only log of flag changes (enables progress history later). */
export const progressEvents = sqliteTable(
  "progress_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    nodeId: text("node_id").notNull(),
    done: integer("done", { mode: "boolean" }).notNull(),
    at: text("at").notNull(),
  },
  (t) => [index("progress_events_node").on(t.nodeId)],
);

export const studySessions = sqliteTable("study_sessions", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  start: text("start").notNull(),
  durationMin: integer("duration_min").notNull(),
  courseKey: text("course_key").notNull(),
  evaluationKey: text("evaluation_key"),
  topicId: text("topic_id"),
  goal: text("goal"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const annotations = sqliteTable("annotations", {
  nodeId: text("node_id").primaryKey(),
  text: text("text").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON
});

/** Entity id (derived calendar event) ↔ Google event id, for one-way upserts. */
export const gcalLinks = sqliteTable("gcal_links", {
  entityId: text("entity_id").primaryKey(),
  googleEventId: text("google_event_id").notNull(),
  hash: text("hash").notNull(),
  updatedAt: text("updated_at").notNull(),
});
