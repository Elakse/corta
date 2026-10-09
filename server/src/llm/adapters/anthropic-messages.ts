import Anthropic from "@anthropic-ai/sdk";
import type { ChatRequest, ChatStreamEvent } from "../../../../shared/api";
import type { LlmProvider } from "../provider";

interface MessagesProfile {
  id: string;
  label: string;
  models: string[];
  key: () => string;
  model: () => string;
  endpoint?: string;
}

export function createAnthropicMessagesProvider(profile: MessagesProfile): LlmProvider {
  return {
    id: profile.id, label: profile.label, models: profile.models,
    model: profile.model, configured: () => Boolean(profile.key()),
    async *stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatStreamEvent> {
      const client = new Anthropic({ apiKey: profile.key(), baseURL: profile.endpoint, maxRetries: 0 });
      const stream = client.messages.stream(
        {
          model: req.model ?? profile.model(),
          max_tokens: 4096,
          system: req.system,
          messages: req.messages as Anthropic.MessageParam[],
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
    },
  };
}
