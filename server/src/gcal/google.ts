/**
 * Google Calendar one-way push (app → Google) into a dedicated "Corta" calendar.
 * Uses the narrow `calendar.app.created` scope: the app can only see and change calendars it created,
 * so it physically cannot touch your other calendars.
 */
import { google, type calendar_v3 } from "googleapis";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { SyncEvent, SyncResult } from "../../../shared/api";
import type { Db } from "../db/client";
import { gcalLinks } from "../db/schema";
import { deleteSetting, getSetting, setSetting } from "../db/settings";
import { env } from "../env";

export const SCOPES = ["https://www.googleapis.com/auth/calendar.app.created"];
const TOKENS = "secret.gcal.tokens";
const CAL = "gcal.calendarId";
const LAST = "gcal.lastSync";

export const isConfigured = () => Boolean(env.googleClientId && env.googleClientSecret);
const redirectUri = () => `http://localhost:${env.port}/api/gcal/callback`;

function oauth() {
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, redirectUri());
}

export function authUrl(): string {
  return oauth().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES });
}

export async function handleCallback(db: Db, code: string): Promise<void> {
  const client = oauth();
  const { tokens } = await client.getToken(code);
  await setSetting(db, TOKENS, tokens);
}

async function authed(db: Db) {
  const tokens = await getSetting<Record<string, unknown>>(db, TOKENS);
  if (!tokens) return null;
  const client = oauth();
  client.setCredentials(tokens);
  client.on("tokens", (t) => void setSetting(db, TOKENS, { ...tokens, ...t }));
  return google.calendar({ version: "v3", auth: client });
}

export async function status(db: Db) {
  return {
    configured: isConfigured(),
    connected: Boolean(await getSetting(db, TOKENS)),
    calendarId: (await getSetting<string>(db, CAL)) ?? null,
    lastSync: (await getSetting<string>(db, LAST)) ?? null,
  };
}

export async function disconnect(db: Db) {
  await deleteSetting(db, TOKENS);
}

const isGone = (e: unknown) => {
  const code = (e as { code?: number; status?: number }).code ?? (e as { status?: number }).status;
  return code === 404 || code === 410;
};

async function ensureCalendar(db: Db, cal: calendar_v3.Calendar, timeZone: string): Promise<string> {
  const id = await getSetting<string>(db, CAL);
  if (id) {
    try {
      await cal.calendars.get({ calendarId: id });
      return id;
    } catch (e) {
      if (!isGone(e)) throw e;
      await db.delete(gcalLinks); // calendar was deleted on Google's side: start over
    }
  }
  const res = await cal.calendars.insert({ requestBody: { summary: "Corta", description: "Synced from Corta (one-way). Edits here are overwritten.", timeZone } });
  await setSetting(db, CAL, res.data.id);
  return res.data.id!;
}

const addDay = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

function toGoogle(e: SyncEvent, timeZone: string): calendar_v3.Schema$Event {
  const time = e.allDay
    ? { start: { date: e.date }, end: { date: addDay(e.endDate ?? e.date) } }
    : { start: { dateTime: `${e.date}T${e.start}:00`, timeZone }, end: { dateTime: `${e.endDate ?? e.date}T${e.end ?? e.start}:00`, timeZone } };
  return {
    summary: e.title,
    description: e.description,
    location: e.location,
    ...time,
    extendedProperties: { private: { cortaId: e.id } },
  };
}

export async function sync(db: Db, events: SyncEvent[], timeZone: string): Promise<SyncResult> {
  const cal = await authed(db);
  if (!cal) throw new Error("Google Calendar isn't connected");
  const calendarId = await ensureCalendar(db, cal, timeZone);
  const links = new Map((await db.select().from(gcalLinks)).map((l) => [l.entityId, l]));
  let created = 0, updated = 0, deleted = 0;
  const now = () => new Date().toISOString();

  for (const e of events) {
    const body = toGoogle(e, timeZone);
    const hash = createHash("sha1").update(JSON.stringify(body)).digest("hex");
    const link = links.get(e.id);
    links.delete(e.id);
    if (link && link.hash === hash) continue;
    if (link) {
      try {
        await cal.events.update({ calendarId, eventId: link.googleEventId, requestBody: body });
        await db.update(gcalLinks).set({ hash, updatedAt: now() }).where(eq(gcalLinks.entityId, e.id));
        updated++;
        continue;
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    }
    const res = await cal.events.insert({ calendarId, requestBody: body });
    await db
      .insert(gcalLinks)
      .values({ entityId: e.id, googleEventId: res.data.id!, hash, updatedAt: now() })
      .onConflictDoUpdate({ target: gcalLinks.entityId, set: { googleEventId: res.data.id!, hash, updatedAt: now() } });
    created++;
  }
  // whatever is left no longer exists in Corta
  for (const link of links.values()) {
    try {
      await cal.events.delete({ calendarId, eventId: link.googleEventId });
    } catch (err) {
      if (!isGone(err)) throw err;
    }
    await db.delete(gcalLinks).where(eq(gcalLinks.entityId, link.entityId));
    deleted++;
  }
  await setSetting(db, LAST, now());
  return { created, updated, deleted, calendarId };
}
