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
