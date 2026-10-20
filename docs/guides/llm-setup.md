# LLM side panel setup

The side panel (**Preguntar**, or the configurable shortcut, initially `Ctrl/⌘ + J`) answers questions about what's on screen. It sees a structured
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

Open **Settings** (the top-bar gear) to select the provider and model without a restart. The model
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

Set `CORTA_LLM_PROVIDER=anthropic` for the initial default, or select Anthropic API in Settings.
Restart Corta after changing keys. Without a key the panel explains how to set it up. The key stays on the server (`/api/llm/*`
proxies and streams); the browser never sees it. Check current model ids at
<https://platform.claude.com/docs/en/models/overview>.

`CORTA_LLM_PROVIDER=mock` sets the initial default to the offline deterministic provider (used by the
e2e tests). If a choice is already saved, select Offline demo in Settings instead.

## How it works

- `app/src/llm/context.ts` builds the snapshot and the system prompt.
- `app/src/llm/ChatPanel.tsx` streams one turn at a time; when the model calls a tool, the app runs the matching
  **action** and sends the result back (up to 5 rounds).
- `server/src/llm/adapters/*`: reusable Chat Completions and Anthropic Messages protocol adapters.
- `server/src/llm/providers/*`: small profiles supplying credential references, endpoint, default model,
  model suggestions, protocol options and error messages. Register new profiles in `providers/index.ts`;
  Settings discovers them through `/api/llm/configuration`. No frontend/provider type switches are needed.
- `PUT /api/llm/selection`: validates and persists provider/model; each chat request pins them explicitly.

Actions: `navigateTo(nodeId)`, `setVariable(name, value)`, `openCollapsible(nodeId)`,
`searchSources(query, refs?)`, `readSourcePage(ref, page)`. Add more: `add-llm-action.md`.

Images (up to 3 per question: files, paste, webcam photo) travel as `image` content blocks; see
[`camera.md`](camera.md). Models without vision are not detected up front: the provider's rejection is
mapped to `images_unsupported` and shown in chat. OpenCode Go image support is unverified.

## Selection menu and source tracing

Selecting text on a study page draws a highlighter stroke (Corta's own selection, `core/highlighter/`, see
below) and shows a floating menu (`llm/selection/SelectionMenu.tsx`, one per notebook, portaled to `<body>`). **Explicar** asks for a short plain-language explanation in the node's context;
**Fuente** asks the tutor to trace the text back to the original material. **Referenciar** sends nothing: it opens
the chat with the selection pinned as a removable quote above the input, so the reader writes their own question
about it (the next message carries the passage; it is cleared on send, with the ✕, or with "Nueva conversación").
The chat shows the selection as a quote plus a short question; the model receives the instruction, the node id/title and the text, with
formulas as their LaTeX (read from KaTeX's MathML annotation; a selection that cuts a formula grows to include it).
The node becomes "this". The menu sits above the selection's first line (below on touch screens, where the
system bar is above), appears once a drag ends, and closes on Esc, outside clicks or an empty selection.

### Highlighter selection (`app/src/core/highlighter/`)
On mouse/pen screens the browser's own selection is off on the sheet (`.hl-root`, `user-select: none`), so
browser popups (Edge's mini menu) never appear; the engine keeps the selection as a DOM Range and paints it.
- `engine.ts`: input (drag, double click = word via `Intl.Segmenter`, triple click = paragraph/cell/formula,
  shift-click, Ctrl/⌘+A, Esc, Ctrl/⌘+C copies the tutor text with LaTeX, auto-scroll at window edges). A click
  outside the sheet clears it unless the target has `data-keeps-selection` (the menu). Touch keeps the native
  selection (handles, system menu) and reports it the same way.
- `geometry.ts`: caret under a point (`caretPositionFromPoint`/`caretRangeFromPoint`, which work with
  `user-select: none`, plus a geometric fallback for margins and gaps), formulas as atoms, boxes of a range.
- `strokes.ts` (pure, unit-tested): boxes → one stroke per visual line covering the letters; splits only at real
  gaps (columns), never inside a table row; chisel ends and darker edges.
- `ink.ts`: SVG over the flow (`<svg class="hl-ink">` in the frame), noise texture in page coordinates,
  multiply on light paper and screen on dark (`--marker-blend`, `markerInk` in `theme/tokens.ts`).
- `store.ts`: `useTextSelection` (`range`, `settled`, `clear`), what the menu reads.
- Marker color: Settings → Resaltador (`highlighter.color`), tokens `marker-<color>` per theme.
Reference prototype: `prototypes/highlighter-selection/`.

Source tracing reads the course's material through `/api/sources/<semester>/<course>/…` (`server/src/routes/sources.ts`):
`search?q=&refs=` ranks pages of the extracted text (`processed/text/`, `=== page N ===` markers or form
feeds), `<ref>/pages/<n>` returns one page, `<ref>/file` serves the original inline. The extracted text for
`sources/a/b.pdf` is `processed/text/a/b.txt`, or a uniquely named `b.txt` anywhere under `processed/text/`.
Answers cite with `[[source:<ref>|<page>]]`, rendered as a chip that opens the file in a new tab (PDFs at that page).
Courses without extracted text can still be cited and opened; search just finds nothing.


## Preferences and reading context

Open the gear in the top bar for **Settings**. While viewing a notebook, its paper choice
(Ruled / Grid) appears below Theme and retains the existing per-evaluation SQLite setting
(`paper:<evaluation key>`). It updates the sheet immediately; no paper toolbar sits above the notebook.
Theme (Light / Dark / System), tutor provider,
model, and the chat shortcut live together here. Click the shortcut field, then press Ctrl/⌘ or
Alt plus a character key (optionally Shift). Disable removes the shortcut; Reset restores
Ctrl/⌘ + J. Theme and shortcut use the existing SQLite settings API (`theme`, `chat.shortcut`).
Provider/model use the existing validated connection API; each provider remembers its last model.
Connection controls are disabled during a tutor response so one turn stays with one provider/model.
The native dialog is explicitly centered in the viewport (independent of CSS resets), contains
keyboard focus, supports Escape and restores focus when closed. Short viewports scroll its contents.

On desktop chat expands into the spare desk space, up to 760px, keeping the notebook at its normal width whenever
a panel of at least 320px fits. The sheet-to-panel gap is 12px; notebook width, desk gutter, panel
inset and gap come from theme metrics. Panel sizing uses the available layout width (excluding the
scrollbar). When both no longer fit, the notebook reserves its final reading width once; the panel uses a
brief transform/opacity transition. Main-area padding is never animated: changing notebook width
every frame also repeatedly runs the ruler and viewport measurements. Below 900px chat docks at
the bottom, leaving full-width paper above. Closing restores the page width immediately.
Reduced-motion preferences skip the panel transition. Home's priority card is one link; the semester
card's title link covers its whole body, while course rows retain their own destinations.

Streaming follows the bottom only while the reader is within 48px of it. Scrolling up pauses
following, including when the response finishes; returning to the bottom resumes it. Sending a
new question, clearing the conversation or reopening chat starts following again. Chunk updates
scroll instantly before paint, avoiding overlapping smooth-scroll animations. Follow intent lives
in a ref, so reading gestures do not cause React renders or change the notebook's selected context.

`llm/viewport.ts` owns one tracker per notebook. It measures registered node rectangles on scroll,
resize and content size changes, once per animation frame. Scores account for the usable reading
viewport (excluding the sticky header and the mobile chat dock), visible fraction normalized for
tall blocks, and distance from a reading line 35% down the viewport. Hidden/unmounted nodes are
excluded. Ties keep document order; non-container nodes take precedence over containers.

A clicked node is preferred only while visible in the current evaluation; leaving the viewport clears it. Wheel, touch and reading
navigation keys release this explicit selection; scrolling chat does not. Route changes remount
the notebook and clear old visibility/selection. The context label subscribes to the live snapshot.
Before **every request**, including tool follow-ups, chat synchronously refreshes viewport measurements
and reads the current route, variables and progress from their stores. Previous turns stay in history;
the current screen is authoritative. Navigation tools wait for the page/node instead of assuming a
fixed startup delay, and actions get a rendering turn before the next snapshot is built.

When extending this flow, keep viewport collection in `llm/viewport.ts`, pure snapshot rules in
`llm/context.ts`, and shared connection state in `llm/connection.ts`. Do not add a second observer to
individual blocks or reuse a snapshot captured before an asynchronous tool action. Verify context
with the mock provider and inspect `/api/llm/chat` request bodies in a browser regression test.
