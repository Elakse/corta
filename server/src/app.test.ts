import { beforeEach, describe, expect, it } from "vitest";
import { openDb } from "./db/client";
import { createApp } from "./app";

let app: ReturnType<typeof createApp>;
const json = (method: string, body?: unknown) => ({ method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(async () => {
  app = createApp(await openDb(":memory:"));
});

describe("api", () => {
  it("stores only own flags and logs events", async () => {
    await app.request("/api/progress", json("POST", { set: ["a", "b"] }));
    await app.request("/api/progress", json("POST", { unset: ["a"] }));
    expect(await (await app.request("/api/progress")).json()).toEqual({ done: ["b"] });
    const ev = (await (await app.request("/api/progress/events")).json()) as { events: unknown[] };
    expect(ev.events).toHaveLength(3);
  });
  it("rejects invalid bodies readably", async () => {
    const r = await app.request("/api/progress", json("POST", { set: "nope" }));
    expect(r.status).toBe(400);
  });
  it("round-trips settings and hides secrets", async () => {
    await app.request("/api/settings/paper:x", json("PUT", { value: "grid" }));
    expect(await (await app.request("/api/settings/paper:x")).json()).toEqual({ value: "grid" });
    expect((await app.request("/api/settings/secret.gcal.tokens", json("PUT", { value: 1 }))).status).toBe(403);
  });
  it("CRUDs study sessions", async () => {
    const created = (await (await app.request("/api/sessions", json("POST", { date: "2026-10-10", start: "18:00", durationMin: 90, courseKey: "s/c" }))).json()) as { id: string };
    const upd = await app.request(`/api/sessions/${created.id}`, json("PUT", { date: "2026-10-11", start: "19:00", durationMin: 60, courseKey: "s/c", goal: "repaso" }));
    expect(((await upd.json()) as { goal: string }).goal).toBe("repaso");
    await app.request(`/api/sessions/${created.id}`, { method: "DELETE" });
    expect(((await (await app.request("/api/sessions")).json()) as { sessions: unknown[] }).sessions).toHaveLength(0);
  });
});
