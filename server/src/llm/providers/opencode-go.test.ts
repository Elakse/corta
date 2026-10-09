import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../../env";
import { GO_ENDPOINT, GO_MODEL, opencodeGoProvider as provider } from "./opencode-go";
import { createChatCompletionsProvider, chatCompletionMessages } from "../adapters/chat-completions";
import type { ChatRequest, ChatStreamEvent } from "../../../../shared/api";

const request: ChatRequest = { system: "Tutor", messages: [{ role: "user", content: "Explain λ" }], tools: [{ name: "setVariable", description: "Change a value", input_schema: { type: "object" } }], sessionId: "31293696-f14f-4922-868c-dda0c322f92f" };
const original = { key: env.opencodeGoKey, model: env.llmModel };
afterEach(() => { vi.unstubAllGlobals(); env.opencodeGoKey = original.key; env.llmModel = original.model; });

function response(events: unknown[], done = true) {
  const wire = events.map((e) => `data: ${JSON.stringify(e)}\r\n\r\n`).join("") + (done ? "data: [DONE]\r\n\r\n" : "");
  const bytes = new TextEncoder().encode(wire);
  // One byte per chunk exercises UTF-8 and SSE delimiter fragmentation.
  return new Response(new ReadableStream({ start(c) { for (const b of bytes) c.enqueue(new Uint8Array([b])); c.close(); } }));
}
const chunk = (delta: unknown, finish: string | null = null) => ({ choices: [{ index: 0, delta, finish_reason: finish }] });
async function collect(req = request, signal = new AbortController().signal) {
  const events: ChatStreamEvent[] = [];
  for await (const e of provider.stream(req, signal)) events.push(e);
  return events;
}

describe("OpenCode Go", () => {
  it("reuses the protocol adapter for a different profile without Go-specific behavior", async () => {
    const other = createChatCompletionsProvider({ id: "other", label: "Other", endpoint: "https://example.invalid/chat/completions", key: () => "test", model: () => "other-model", models: ["other-model"], error: () => "Other error" });
    const fetch = vi.fn().mockResolvedValue(response([chunk({ content: "OK" }, "stop")]));
    vi.stubGlobal("fetch", fetch);
    for await (const _event of other.stream(request, new AbortController().signal)) { /* consume */ }
    expect(fetch.mock.calls[0]![0]).toBe("https://example.invalid/chat/completions");
    const init = fetch.mock.calls[0]![1];
    expect(init.headers["x-opencode-session"]).toBeUndefined();
    expect(JSON.parse(init.body).thinking).toBeUndefined();
    expect(JSON.parse(init.body).model).toBe("other-model");
  });
  it("streams unicode and pins the subscription endpoint, session and model", async () => {
    env.opencodeGoKey = "test-only"; env.llmModel = "";
    const fetch = vi.fn().mockResolvedValue(response([chunk({ content: "λ: acá" }), chunk({}, "stop")]));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    expect(await collect(request, signal)).toEqual([{ type: "text", text: "λ: acá" }, { type: "done", stopReason: "stop" }]);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(GO_ENDPOINT);
    expect(init.signal).toBe(signal);
    expect(init.redirect).toBe("error");
    expect(init.headers["x-opencode-session"]).toBe(request.sessionId);
    expect(init.headers["User-Agent"]).toBe("corta-study-tutor/0.1");
    const body = JSON.parse(init.body);
    expect(body.model).toBe(GO_MODEL);
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.tools[0].function.parameters).toEqual(request.tools[0]!.input_schema);
  });

  it("reassembles interleaved page actions and round-trips their results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
      chunk({ tool_calls: [{ index: 1, id: "b", function: { name: "openCollapsible", arguments: '{"nodeId":' } }, { index: 0, id: "a", function: { name: "setVariable", arguments: '{"name":"x",' } }] }),
      chunk({ tool_calls: [{ index: 0, function: { arguments: '"value":2}' } }, { index: 1, function: { arguments: '"topic"}' } }] }),
      chunk({}, "tool_calls"),
    ])));
    expect(await collect()).toEqual([
      { type: "tool_use", id: "a", name: "setVariable", input: { name: "x", value: 2 } },
      { type: "tool_use", id: "b", name: "openCollapsible", input: { nodeId: "topic" } },
      { type: "done", stopReason: "tool_calls" },
    ]);
    expect(chatCompletionMessages({ ...request, messages: [
      { role: "assistant", content: [{ type: "text", text: "Changing it" }, { type: "tool_use", id: "a", name: "setVariable", input: { name: "x", value: 2 } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "a", content: "x = 2" }] },
      { role: "assistant", content: "Done" },
    ] })).toEqual([
      { role: "system", content: "Tutor" },
      { role: "assistant", content: "Changing it", tool_calls: [{ id: "a", type: "function", function: { name: "setVariable", arguments: '{"name":"x","value":2}' } }] },
      { role: "tool", tool_call_id: "a", content: "x = 2" },
      { role: "assistant", content: "Done" },
    ]);
  });

  it.each([401, 402, 403, 429, 500])("sanitizes HTTP %s errors without retries or fallback", async (status) => {
    const fetch = vi.fn().mockResolvedValue(new Response("secret upstream data", { status }));
    vi.stubGlobal("fetch", fetch);
    await expect(collect()).rejects.toThrow(/OpenCode Go/);
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(collect()).rejects.not.toThrow("secret upstream data");
  });

  it.each(["length", "stop"])("does not emit actions after an unexpected %s finish", async (finish) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([chunk({ tool_calls: [{ index: 0, id: "a", function: { name: "setVariable", arguments: "{}" } }] }), chunk({}, finish)])));
    await expect(collect()).rejects.toThrow();
  });

  it("rejects premature streams and malformed arguments before emitting any action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([chunk({}, "stop")], false)));
    await expect(collect()).rejects.toThrow("ended early");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([chunk({ tool_calls: [
      { index: 0, id: "a", function: { name: "setVariable", arguments: "{}" } },
      { index: 1, id: "b", function: { name: "setVariable", arguments: "{" } },
    ] }), chunk({}, "tool_calls")])));
    const emitted: ChatStreamEvent[] = [];
    await expect((async () => { for await (const e of provider.stream(request, new AbortController().signal)) emitted.push(e); })()).rejects.toThrow("invalid page action");
    expect(emitted).toEqual([]);
  });

  it("propagates cancellation without a retry", async () => {
    const ctrl = new AbortController(); ctrl.abort();
    const fetch = vi.fn().mockRejectedValue(ctrl.signal.reason);
    vi.stubGlobal("fetch", fetch);
    await expect(collect(request, ctrl.signal)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
