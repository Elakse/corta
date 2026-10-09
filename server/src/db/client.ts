import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../env";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Opens (and migrates) the SQLite state database. `:memory:` is accepted for tests. */
export async function openDb(path: string): Promise<Db> {
  let url = ":memory:";
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
    url = pathToFileURL(path).href;
  }
  const client = createClient({ url: url === ":memory:" ? "file::memory:" : url });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: resolve(ROOT, "server/drizzle") });
  return db;
}
