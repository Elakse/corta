import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { openDb } from "../db/client";
import { createApp } from "../app";
import { env } from "../env";
import type { LlmConfiguration } from "../../../shared/api";

let app: ReturnType<typeof createApp>;
const originalKey = env.opencodeGoKey;
const json = (body: unknown) => ({ method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(async () => { app = createApp(await openDb(":memory:")); });
afterEach(() => { vi.unstubAllGlobals(); env.opencodeGoKey = originalKey; });

describe("tutor selection", () => {
  it("persists models independently and never returns credentials", async () => {
    env.opencodeGoKey = "secret-for-test";
    await app.request("/api/llm/selection", json({ provider: "opencode-go", model: "deepseek-v4-flash" }));
    await app.request("/api/llm/selection", json({ provider: "anthropic", model: "claude-opus-5-5" }));
    const c = await (await app.request("/api/llm/configuration")).json() as LlmConfiguration;
    expect(c.selection).toEqual({ provider: "anthropic", model: "claude-opus-5-5" });
    expect(c.models["opencode-go"]).toBe("deepseek-v4-flash");
    expect(c.providers.find((p) => p.id === "opencode-go")?.configured).toBe(true);
    expect(JSON.stringify(c)).not.toContain("secret-for-test");
    expect(await (await app.request("/api/llm/status")).json()).toEqual({ provider: "anthropic", model: "claude-opus-5-5", configured: Boolean(env.anthropicKey) });
  });
  it("rejects unknown providers and invalid model IDs", async () => {
    expect((await app.request("/api/llm/selection", json({ provider: "unknown", model: "x" }))).status).toBe(400);
    expect((await app.request("/api/llm/selection", json({ provider: "opencode-go", model: "invalid\nheader" }))).status).toBe(400);
  });
  it("never falls back when a selected provider lacks credentials", async () => {
    env.opencodeGoKey = "";
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await app.request("/api/llm/chat", { ...json({ system: "Tutor", messages: [], provider: "opencode-go", model: "deepseek-v4.1-flash" }), method: "POST" });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("pins explicitly requested provider/model rather than silently using saved preferences", async () => {
    env.opencodeGoKey = "test-only";
    await app.request("/api/llm/selection", json({ provider: "mock", model: "mock" }));
    const fetch = vi.fn().mockResolvedValue(new Response('data: {"choices":[{"index":0,"delta":{"content":"Answer"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
    vi.stubGlobal("fetch", fetch);
    const response = await app.request("/api/llm/chat", { ...json({ system: "Tutor", messages: [], provider: "opencode-go", model: "deepseek-v4-flash" }), method: "POST" });
    expect(await response.text()).toContain("Answer");
    expect(JSON.parse(fetch.mock.calls[0]![1].body).model).toBe("deepseek-v4-flash");
  });
});
