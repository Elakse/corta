# Add a tutor provider

1. Add a profile file under `server/src/llm/providers/`.
2. Reuse `createChatCompletionsProvider` or `createAnthropicMessagesProvider` from `adapters/`.
   For a new protocol, implement `LlmProvider` in a new adapter instead of adding type switches.
3. Supply `id`, `label`, `models` (suggestions), `model()` (default), and `key()` (server-side credential).
   Chat Completions profiles also supply a fixed `endpoint`, sanitized `error(status)`, and optional
   `headers(req)` / `parameters(model)` for provider-specific protocol requirements.
4. Add the credential and per-provider default model to `server/src/env.ts` and `.env.example`.
   `providerModel(id, override, fallback)` keeps the legacy global override scoped to its default provider.
5. Register the profile in `providers/index.ts`. Settings discovers it automatically; no UI edits needed.
6. Test streaming, cancellation, tool calls/results and provider failures using mocked network responses.
   Check that it never falls back to a different endpoint and never returns credentials in configuration.
7. Update the setup guide, docs index, decision log and AGENTS status.

The browser supplies only a registered provider ID and model ID, never credentials or arbitrary endpoints.
Models entered in Settings must support the chosen adapter's protocol. Saved choices live in
`llm.configuration`; keys remain in `.env`. Transport retries/fallbacks must not introduce extra charges.
