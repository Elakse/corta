import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { settings } from "./schema";

export async function getSetting<T>(db: Db, key: string): Promise<T | undefined> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export async function setSetting(db: Db, key: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value ?? null);
  await db.insert(settings).values({ key, value: json }).onConflictDoUpdate({ target: settings.key, set: { value: json } });
}

export async function deleteSetting(db: Db, key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}
