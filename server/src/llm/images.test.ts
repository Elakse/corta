import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatRequest, MAX_CHAT_IMAGES, type ChatMessage, type ChatStreamEvent } from "../../../shared/api";
import { env } from "../env";
import { openDb } from "../db/client";
import { createApp } from "../app";
import { anthropicMessages } from "./adapters/anthropic-messages";
import { chatCompletionMessages } from "./adapters/chat-completions";
import { opencodeGoProvider } from "./providers/opencode-go";
import { hasImages, looksLikeImageRejection } from "./images";

const image = (data = "QUJD") => ({ type: "image" as const, mediaType: "image/jpeg" as const, data });
const withImages: ChatMessage[] = [
  { role: "user", content: [{ type: "text", text: "¿Qué dice la hoja?" }, image("QUJD"), image("REVG")] },
];
const request = (messages: ChatMessage[]): ChatRequest => ({ system: "Tutor", messages, tools: [] });

const originalKey = env.opencodeGoKey;
afterEach(() => { vi.unstubAllGlobals(); env.opencodeGoKey = originalKey; });

describe("image messages", () => {
  it("become OpenAI-style content parts with base64 data URLs", () => {
    const [, user] = chatCompletionMessages(request(withImages));
    expect(user).toEqual({
      role: "user",
      content: [
        { type: "text", text: "¿Qué dice la hoja?" },
        { type: "image_url", image_url: { url: "data:image/jpeg;base64,QUJD" } },
        { type: "image_url", image_url: { url: "data:image/jpeg;base64,REVG" } },
      ],
    });
  });
  it("become Anthropic base64 sources placed before the text", () => {
    const [user] = anthropicMessages(withImages);
    expect(user).toEqual({
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "QUJD" } },
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "REVG" } },
        { type: "text", text: "¿Qué dice la hoja?" },
      ],
    });
  });
  it("leave text-only and tool turns unchanged", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "hola" }, { role: "assistant", content: [{ type: "tool_use", id: "t", name: "x", input: {} }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "ok" }] }];
    expect(anthropicMessages(messages)[0]).toEqual({ role: "user", content: "hola" });
    expect(anthropicMessages(messages)[1]!.content).toEqual([{ type: "tool_use", id: "t", name: "x", input: {} }]);
    expect(hasImages(request(messages))).toBe(false);
    expect(hasImages(request(withImages))).toBe(true);
  });
  it("accept at most three images in one message", () => {
    const four: ChatMessage[] = [{ role: "user", content: [image(), image(), image(), image()] }];
    expect(MAX_CHAT_IMAGES).toBe(3);
    expect(ChatRequest.safeParse(request(four)).success).toBe(false);
    expect(ChatRequest.safeParse(request(withImages)).success).toBe(true);
  });
  it("classify image rejections loosely and only for client errors", () => {
    expect(looksLikeImageRejection(400, '{"error":{"message":"This model does not support image input"}}')).toBe(true);
    expect(looksLikeImageRejection(422, "multimodal content is not supported")).toBe(true);
    expect(looksLikeImageRejection(400, '{"error":"bad max_tokens"}')).toBe(false);
    expect(looksLikeImageRejection(500, "image decoding failed")).toBe(false);
  });
});

describe("a model that cannot see images", () => {
  async function run(messages: ChatMessage[], status: number, body: string) {
    env.opencodeGoKey = "test-only";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status })));
    const events: ChatStreamEvent[] = [];
    try { for await (const e of opencodeGoProvider.stream(request(messages), new AbortController().signal)) events.push(e); return { events, error: null as unknown };
    } catch (error) { return { events, error }; }
  }
  it("reports a coded error the app can explain, without forwarding the upstream body", async () => {
    const { error } = await run(withImages, 400, '{"error":{"message":"image_url is not supported by deepseek-v4.1-flash","secret":"abc"}}');
    expect(error).toMatchObject({ code: "images_unsupported" });
    expect((error as Error).message).not.toContain("abc");
  });
  it("keeps the generic message for unrelated failures", async () => {
    const { error } = await run(withImages, 400, '{"error":"temperature out of range"}');
    expect(error).not.toHaveProperty("code");
    expect((error as Error).message).toContain("HTTP 400");
  });
  it("does not blame images when none were sent", async () => {
    const { error } = await run([{ role: "user", content: "hola" }], 400, "image field invalid");
    expect(error).not.toHaveProperty("code");
  });
  it("travels over the chat stream as a code next to the message", async () => {
    env.opencodeGoKey = "test-only";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":"vision input unsupported"}', { status: 400 })));
    const app = createApp(await openDb(":memory:"));
    const res = await app.request("/api/llm/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ system: "Tutor", messages: withImages, provider: "opencode-go", model: "deepseek-v4.1-flash" }) });
    const events = (await res.text()).split("\n\n").filter(Boolean).map((l) => JSON.parse(l.replace(/^data: /, "")) as ChatStreamEvent);
    expect(events).toEqual([{ type: "error", message: expect.stringContaining("images"), code: "images_unsupported" }]);
  });
});
