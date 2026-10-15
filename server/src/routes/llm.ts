import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ChatRequest, LlmSelection, type LlmConfiguration } from "../../../shared/api";
import { activeProvider, providerProfiles } from "../llm/providers";
import { ChatError } from "../llm/images";
import { validJson } from "../validate";
import type { Db } from "../db/client";
import { getSetting, setSetting } from "../db/settings";

/** Stateless LLM proxy: keeps the API key on the server and streams one assistant turn as SSE. */
export function llmRoutes(db: Db) {
  async function configuration(): Promise<LlmConfiguration> {
    const saved = await getSetting<{ selection?: unknown; models?: Record<string, string> }>(db, "llm.configuration");
    const parsed = LlmSelection.safeParse(saved?.selection);
    const fallback = activeProvider();
    const selection = parsed.success ? parsed.data : { provider: fallback.id, model: fallback.model() };
    return { selection, models: saved?.models ?? {}, providers: providerProfiles() };
  }
  return new Hono()
    .get("/configuration", async (c) => c.json(await configuration()))
    .put("/selection", validJson(LlmSelection), async (c) => {
      const selection = c.req.valid("json");
      let p;
      try { p = activeProvider(selection.provider); } catch { return c.json({ error: "Unknown tutor provider" }, 400); }
      if (p.id === "mock" && selection.model !== "mock") return c.json({ error: "Offline demo only supports the mock model" }, 400);
      const current = await configuration();
      await setSetting(db, "llm.configuration", { selection, models: { ...current.models, [selection.provider]: selection.model } });
      return c.json(await configuration());
    })
    .get("/status", async (c) => {
      const { selection } = await configuration();
      const p = activeProvider(selection.provider);
      return c.json({ configured: p.configured(), ...selection });
    })
    .post("/chat", validJson(ChatRequest), async (c) => {
      const input = c.req.valid("json");
      const { selection } = await configuration();
      let p;
      try { p = activeProvider(input.provider ?? selection.provider); } catch { return c.json({ error: "Unknown tutor provider" }, 400); }
      if (!p.configured()) return c.json({ error: "LLM not configured: see docs/guides/llm-setup.md" }, 400);
      const model = input.model ?? (p.id === selection.provider ? selection.model : p.model());
      const req = { ...input, model };
      return streamSSE(c, async (sse) => {
        const ctrl = new AbortController();
        sse.onAbort(() => ctrl.abort());
        try {
          for await (const ev of p.stream(req, ctrl.signal)) await sse.writeSSE({ data: JSON.stringify(ev) });
        } catch (e) {
          await sse.writeSSE({ data: JSON.stringify({ type: "error", message: e instanceof Error ? e.message : String(e), ...(e instanceof ChatError && e.code ? { code: e.code } : {}) }) });
        }
      });
    });
}
