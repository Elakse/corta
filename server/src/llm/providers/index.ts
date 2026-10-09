import type { LlmProvider } from "../provider";
import { anthropicProvider } from "./anthropic";
import { mockProvider } from "./mock";
import { opencodeGoProvider } from "./opencode-go";

/** Provider registry. The active one is chosen by CORTA_LLM_PROVIDER (default: anthropic). */
const providers = new Map<string, LlmProvider>([anthropicProvider, mockProvider, opencodeGoProvider].map((p) => [p.id, p]));

export function activeProvider(id = (process.env.CORTA_LLM_PROVIDER ?? "anthropic").trim() || "anthropic"): LlmProvider {
  const p = providers.get(id);
  if (!p) throw new Error(`unknown LLM provider "${id}" (available: ${[...providers.keys()].join(", ")})`);
  return p;
}

/** Only public profile metadata; credentials and endpoints never come from browser input. */
export function providerProfiles() {
  return [...providers.values()].map((p) => ({ id: p.id, label: p.label, configured: p.configured(), defaultModel: p.model(), models: p.models }));
}
