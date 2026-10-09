# LLM side panel setup

The side panel (**Preguntar**, or `Ctrl/⌘ + J`) answers questions about what's on screen. It sees a structured
snapshot (never the DOM): current route, the selected node (click a definition/theorem/exercise to select it)
or else the most visible one, the blocks' descriptions, live page variables, progress and sources.

## OpenCode Go (subscription)

Set these in the local, ignored `.env` file (never paste the key in chat):

```dotenv
CORTA_LLM_PROVIDER=opencode-go
OPENCODE_GO_API_KEY=<your Go key>
CORTA_OPENCODE_GO_MODEL=deepseek-v4.1-flash
```

Get the key from the OpenCode Console for your Go subscription. Restart Corta and open **Preguntar**
(`Ctrl/⌘ + J`). No OpenCode installation or local agent server is required. `/api/llm/status` reports
provider/model/configured, never the key. A missing key leaves chat disabled.

The two controls beneath the tutor header select the provider and model without a restart. The model
field suggests known IDs and also accepts a custom ID; press Enter or leave the field to save it. Custom
IDs must support that provider's protocol. Selection and each provider's last model persist in SQLite
under `llm.configuration`. Switching preserves conversation text and starts a fresh provider session ID;
controls are disabled during a turn so all its tool rounds use the same provider/model. Unconfigured
profiles remain selectable for setup but cannot send messages. Secrets stay in `.env`, never SQLite or
the browser. Only adding/changing credentials requires a restart.

`CORTA_LLM_PROVIDER` and provider-specific model variables establish initial defaults. Saved choices
take precedence. `CORTA_LLM_MODEL` remains a legacy override for the environment's default provider only;
it never carries a DeepSeek model into Anthropic. Anthropic's default uses `CORTA_ANTHROPIC_MODEL`.

**Disable “Use balance” in the OpenCode Console.** This account setting permits Go to consume paid Zen
credits after its allowance runs out; Corta cannot read or enforce that setting. Corta sends requests only
to `https://opencode.ai/zen/go/v1/chat/completions`, refuses redirects and never retries or falls back to
Zen, DeepSeek directly, or another provider. HTTP 402/429 produce an allowance/rate-limit message.

DeepSeek V4.1 Flash is the default for this provider. Model overrides must support Go's Chat Completions
endpoint. Non-thinking mode is explicit: Corta retains answer/tool history, not reasoning history.
Streaming tool fragments are assembled and checked before the existing client-side actions run. A
conversation UUID stays stable across turns and tool rounds, and changes when you clear chat.

OpenCode's current docs describe Go as intended for coding agents; general study tutoring is not explicitly
confirmed. Endpoint availability does not establish permitted usage. Current setup and account limits:
[Go docs](https://opencode.ai/docs/go/). No live inference is verified until a local key is supplied and the
account's overflow setting is checked.

## Anthropic API (usage billed separately)

In `.env`:

```dotenv
ANTHROPIC_API_KEY=sk-ant-...
# optional: defaults to the id in server/src/llm/providers/anthropic.ts (claude-sonnet-5-5 as of 2026-10-07)
CORTA_ANTHROPIC_MODEL=claude-opus-5-5
```

Set `CORTA_LLM_PROVIDER=anthropic` for the initial default, or select Anthropic API in the panel.
Restart Corta after changing keys. Without a key the panel explains how to set it up. The key stays on the server (`/api/llm/*`
proxies and streams); the browser never sees it. Check current model ids at
<https://platform.claude.com/docs/en/models/overview>.

`CORTA_LLM_PROVIDER=mock` sets the initial default to the offline deterministic provider (used by the
e2e tests). If a choice is already saved, select Offline demo in the panel instead.

## How it works

- `app/src/llm/context.ts` builds the snapshot and the system prompt.
- `app/src/llm/ChatPanel.tsx` streams one turn at a time; when the model calls a tool, the app runs the matching
  **action** and sends the result back (up to 5 rounds).
- `server/src/llm/adapters/*`: reusable Chat Completions and Anthropic Messages protocol adapters.
- `server/src/llm/providers/*`: small profiles supplying credential references, endpoint, default model,
  model suggestions, protocol options and error messages. Register new profiles in `providers/index.ts`;
  the panel discovers them through `/api/llm/configuration`. No frontend/provider type switches are needed.
- `PUT /api/llm/selection`: validates and persists provider/model; each chat request pins them explicitly.

Actions available in v1: `navigateTo(nodeId)`, `setVariable(name, value)`, `openCollapsible(nodeId)`.
Add more: `add-llm-action.md`.
