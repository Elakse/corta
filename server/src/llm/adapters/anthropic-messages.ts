import Anthropic from "@anthropic-ai/sdk";
import type { ChatContentBlock, ChatMessage, ChatRequest, ChatStreamEvent } from "../../../../shared/api";
import type { LlmProvider } from "../provider";
import { ChatError, hasImages, IMAGES_UNSUPPORTED } from "../images";

interface MessagesProfile {
  id: string;
  label: string;
  models: string[];
  key: () => string;
  model: () => string;
  endpoint?: string;
}

/** Corta's neutral history → Anthropic messages (images become base64 sources, placed before the text). */
export function anthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    const image = (b: ChatContentBlock): Anthropic.ContentBlockParam =>
      b.type === "image" ? { type: "image", source: { type: "base64", media_type: b.mediaType, data: b.data } } : (b as Anthropic.ContentBlockParam);
    const images = m.content.filter((b) => b.type === "image");
    return { role: m.role, content: [...images, ...m.content.filter((b) => b.type !== "image")].map(image) };
  });
}

export function createAnthropicMessagesProvider(profile: MessagesProfile): LlmProvider {
  return {
    id: profile.id, label: profile.label, models: profile.models,
    model: profile.model, configured: () => Boolean(profile.key()),
    async *stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatStreamEvent> {
      const client = new Anthropic({ apiKey: profile.key(), baseURL: profile.endpoint, maxRetries: 0 });
      try {
        const stream = client.messages.stream(
          {
            model: req.model ?? profile.model(),
            max_tokens: 4096,
            system: req.system,
            messages: anthropicMessages(req.messages),
            tools: req.tools as Anthropic.Tool[],
          },
          { signal },
        );
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield { type: "text", text: ev.delta.text };
        }
        const final = await stream.finalMessage();
        for (const block of final.content) {
          if (block.type === "tool_use") yield { type: "tool_use", id: block.id, name: block.name, input: block.input };
        }
        yield { type: "done", stopReason: final.stop_reason };
      } catch (e) {
        if (hasImages(req) && e instanceof Anthropic.BadRequestError && /image|media/i.test(e.message)) throw new ChatError(IMAGES_UNSUPPORTED, "images_unsupported");
        throw e;
      }
    },
  };
}
