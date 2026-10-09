import { randomUUID } from "node:crypto";
import { env, providerModel } from "../../env";
import { createChatCompletionsProvider } from "../adapters/chat-completions";

// Subscription endpoint is intentionally fixed; never fall back to paid Zen.
export const GO_ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions";
export const GO_MODEL = "deepseek-v4.1-flash";

export const opencodeGoProvider = createChatCompletionsProvider({
  id: "opencode-go", label: "OpenCode Go",
  endpoint: GO_ENDPOINT, key: () => env.opencodeGoKey,
  model: () => providerModel("opencode-go", env.opencodeGoModel, GO_MODEL),
  models: [GO_MODEL, "deepseek-v4-flash", "deepseek-v4-pro", "glm-5.3-flash", "glm-5.3", "kimi-k3"],
  headers: (req) => ({ "User-Agent": "corta-study-tutor/0.1", "x-opencode-session": req.sessionId ?? randomUUID() }),
  // Reasoning history isn't part of Corta's conversation contract.
  parameters: (model) => model.startsWith("deepseek-") ? { thinking: { type: "disabled" } } : {},
  error(status) {
    if (status === 401) return "OpenCode Go key is invalid. Check OPENCODE_GO_API_KEY in .env and restart Corta.";
    if (status === 402 || status === 429) return "OpenCode Go allowance or rate limit reached. Try later or check your Go plan. Corta will not switch to a paid provider.";
    if (status === 403) return "OpenCode Go access denied. Check your subscription and permitted usage.";
    return `OpenCode Go request failed (HTTP ${status}). Check the selected model and try again later.`;
  },
});
