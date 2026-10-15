# Add an LLM action

Actions are things the model can do in the UI. Each is one file in `app/src/llm/actions/` (auto-discovered) and
is exposed to the model as a tool (JSON Schema generated from its Zod input).

```ts
import { z } from "zod";
import { defineAction } from "../registry";

export default defineAction({
  name: "highlightNode",
  description: "Briefly highlight a node so the user can find it.",   // the model reads this: be precise
  input: z.object({ nodeId: z.string() }),
  run({ nodeId }, { graph, navigate }) {
    if (!graph.nodes.has(nodeId)) return `no node "${nodeId}"`;
    // …act through stores (useUi, pageBridge) — never touch the DOM directly
    return "done";                                                      // short result the model sees
  },
});
```

Rules: validate everything through the Zod input; return a short, factual result string; act through state
(`useUi`, `usePageBridge`, stores), not the DOM; keep actions reversible and harmless (the model may call them
unprompted). Add a case to the mock provider or a unit test if the action has logic.

Optional `display(input, result)` returns the one line the chat shows for the call (default `name: result`).
Use it when the result is long (search hits, page text): the model still gets the full result.

## Related registries

Two smaller registries sit next to actions, each auto-discovered from its folder:

**Chat chips** (`app/src/llm/chips/*.ts`, contract in `chip-registry.ts`). Inline syntax the tutor writes in an
answer, `[[name:arg|arg]]`, rendered as a small link after Markdown/KaTeX. `resolve(args, { graph, courseKey })`
returns `{ label, href?, title? }`; no `href` = shown but not clickable (e.g. an unknown ref). `courseKey` is the
course the answer was written in, so chips keep working after navigating away. Teach the model the syntax in
`systemPrompt` (`llm/context.ts`). Built in: `source` → `[[source:clase-03|12]]` opens the original file at that page.

```ts
export default defineChip({
  name: "node",
  icon: "<svg …/>",                       // inline SVG using currentColor
  resolve: ([id], { graph }) => ({ label: graph.nodes.get(id)?.node.title ?? id }),
});
```

**Selection actions** (`app/src/llm/selection/actions/*.ts`, contract in `selection/registry.ts`). Buttons in the
floating menu that appears over text selected on a study page. Each has an `icon` (lucide), a `label` and an `ask`
(i18n keys: the button and the user's chat bubble) and a `prompt(selection)` with the instruction for the model.
The menu appends where the text was selected (node title + id) and the text itself, with formulas as LaTeX.
Built in: `explain` and `source`. Requests go through `askTutor()` (`llm/chat-bridge.ts`), which anything in the
app can call to open the chat and send a question once the connection is ready.
