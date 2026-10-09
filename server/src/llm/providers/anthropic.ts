import { env, providerModel } from "../../env";
import { createAnthropicMessagesProvider } from "../adapters/anthropic-messages";

export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const anthropicProvider = createAnthropicMessagesProvider({
  id: "anthropic", label: "Anthropic API",
  models: [DEFAULT_MODEL, "claude-opus-5-5"],
  model: () => providerModel("anthropic", env.anthropicModel, DEFAULT_MODEL),
  key: () => env.anthropicKey,
});
