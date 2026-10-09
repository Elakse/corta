import type { ChatRequest, ChatStreamEvent } from "../../../shared/api";

/** An LLM backend. Adding one = a file in providers/ that registers itself in providers/index.ts. */
export interface LlmProvider {
  id: string;
  label: string;
  /** Suggestions; custom IDs must use this provider's supported protocol. */
  models: string[];
  model: () => string;
  configured: () => boolean;
  /** Streams one assistant turn. Tool calls are returned to the app, which runs its registered actions. */
  stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatStreamEvent>;
}
