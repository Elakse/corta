import { z } from "zod";
import type { ChatRequest, ChatStreamEvent } from "../../../../shared/api";
import type { LlmProvider } from "../provider";
import { ChatError, hasImages, IMAGES_UNSUPPORTED, looksLikeImageRejection } from "../images";

export interface ChatCompletionsProfile {
  id: string;
  label: string;
  endpoint: string;
  key: () => string;
  model: () => string;
  models: string[];
  headers?: (req: ChatRequest) => Record<string, string>;
  parameters?: (model: string) => Record<string, unknown>;
  error: (status: number) => string;
}

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  tool_call_id?: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
}

/** Translate Corta's provider-neutral history, including client-side tool results. */
export function chatCompletionMessages(req: ChatRequest): ChatCompletionMessage[] {
  const out: ChatCompletionMessage[] = [{ role: "system", content: req.system }];
  for (const msg of req.messages) {
    if (typeof msg.content === "string") {
      out.push({ role: msg.role, content: msg.content });
      continue;
    }
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const calls = msg.content.filter((b) => b.type === "tool_use").map((b) => ({
      id: b.id, type: "function" as const, function: { name: b.name, arguments: JSON.stringify(b.input) },
    }));
    // Tool results precede any new user text in the next round.
    for (const b of msg.content) {
      if (b.type === "tool_result") out.push({ role: "tool", tool_call_id: b.tool_use_id, content: b.is_error ? `Error: ${b.content}` : b.content });
    }
    const images = msg.content.filter((b) => b.type === "image");
    if (images.length) {
      // Multimodal turn: OpenAI-style content parts, images as base64 data URLs.
      const parts: ContentPart[] = [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...images.map((b) => ({ type: "image_url" as const, image_url: { url: `data:${b.mediaType};base64,${b.data}` } })),
      ];
      out.push({ role: msg.role, content: parts });
      continue;
    }
    if (text || calls.length) out.push({ role: msg.role, content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
  }
  return out;
}

const chunkSchema = z.object({
  choices: z.array(z.object({
    index: z.number(),
    delta: z.object({
      content: z.string().nullable().optional(),
      tool_calls: z.array(z.object({
        index: z.number().int().nonnegative(),
        id: z.string().optional(),
        function: z.object({ name: z.string().optional(), arguments: z.string().optional() }).optional(),
      })).optional(),
    }),
    finish_reason: z.string().nullable().optional(),
  })),
});

/** Decode SSE across arbitrary byte boundaries (including CRLF and split UTF-8). */
async function* dataEvents(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, "");
        buffer = buffer.slice(end + 1);
        if (!line && data.length) { yield data.join("\n"); data = []; }
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (done) {
        if (buffer.startsWith("data:")) data.push(buffer.slice(5).replace(/^ /, "").replace(/\r$/, ""));
        if (data.length) yield data.join("\n");
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export function createChatCompletionsProvider(profile: ChatCompletionsProfile): LlmProvider {
  return {
    id: profile.id, label: profile.label, models: profile.models,
    model: profile.model,
    configured: () => Boolean(profile.key()),
    async *stream(req, signal): AsyncIterable<ChatStreamEvent> {
      const response = await fetch(profile.endpoint, {
        method: "POST", signal, redirect: "error",
        headers: {
          Authorization: `Bearer ${profile.key()}`,
          "Content-Type": "application/json",
          ...(profile.headers?.(req) ?? {}),
        },
        body: JSON.stringify({
          model: req.model ?? profile.model(), messages: chatCompletionMessages(req), stream: true, max_tokens: 4096,
          ...(profile.parameters?.(req.model ?? profile.model()) ?? {}),
          ...(req.tools.length ? { tools: req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })) } : {}),
        }),
      });
      if (!response.ok) {
        // A model that can't take images says so in its error body; read it only to classify, never to forward.
        const rejected = hasImages(req) && looksLikeImageRejection(response.status, await response.text().catch(() => ""));
        await response.body?.cancel().catch(() => undefined);
        if (rejected) throw new ChatError(IMAGES_UNSUPPORTED, "images_unsupported");
        // Never forward raw upstream errors: they can contain request data or credentials.
        throw new Error(profile.error(response.status));
      }
      if (!response.body) throw new Error("LLM provider returned an empty stream.");
      const calls = new Map<number, { id: string; name: string; arguments: string }>();
      let finish: string | null = null;
      let ended = false;
      for await (const data of dataEvents(response.body)) {
        if (data === "[DONE]") { ended = true; break; }
        let raw: unknown;
        try { raw = JSON.parse(data); } catch { throw new Error("LLM provider returned an invalid stream."); }
        const parsed = chunkSchema.safeParse(raw);
        if (!parsed.success) throw new Error("LLM provider returned an invalid stream.");
        const choice = parsed.data.choices.find((c) => c.index === 0);
        if (!choice) continue;
        if (choice.delta.content) yield { type: "text", text: choice.delta.content };
        for (const fragment of choice.delta.tool_calls ?? []) {
          const call = calls.get(fragment.index) ?? { id: "", name: "", arguments: "" };
          if (fragment.id) call.id = fragment.id;
          call.name += fragment.function?.name ?? "";
          call.arguments += fragment.function?.arguments ?? "";
          calls.set(fragment.index, call);
        }
        if (choice.finish_reason) finish = choice.finish_reason;
      }
      // Never execute a truncated or unfinished tool call.
      if (!ended || !finish) throw new Error("LLM provider stream ended early. Please retry.");
      if (finish === "length") throw new Error("LLM provider response reached its length limit. Ask for a shorter answer.");
      if (finish !== "stop" && finish !== "tool_calls") throw new Error("LLM provider could not complete the answer.");
      if (finish === "tool_calls" && !calls.size) throw new Error("LLM provider returned an incomplete page action.");
      const ready: ChatStreamEvent[] = [];
      for (const [, call] of [...calls].sort(([a], [b]) => a - b)) {
        if (finish !== "tool_calls" || !call.id || !call.name) throw new Error("LLM provider returned an incomplete page action.");
        let input: unknown;
        try { input = JSON.parse(call.arguments); } catch { throw new Error("LLM provider returned invalid page action arguments."); }
        ready.push({ type: "tool_use", id: call.id, name: call.name, input });
      }
      for (const event of ready) yield event;
      yield { type: "done", stopReason: finish };
    },
  };
}
