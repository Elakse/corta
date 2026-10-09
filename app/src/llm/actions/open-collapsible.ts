import { z } from "zod";
import { useUi } from "@/state/ui";
import { defineAction } from "../registry";

export default defineAction({
  name: "openCollapsible",
  description: "Open the hidden parts (proofs, solutions) of a node so the user can see them.",
  input: z.object({ nodeId: z.string() }),
  run({ nodeId }, { graph }) {
    const ref = graph.nodes.get(nodeId);
    if (!ref) return `no node "${nodeId}"`;
    useUi.getState().openAllIn(nodeId);
    for (const c of ref.node.children) useUi.getState().openAllIn(c.id);
    useUi.getState().scrollTo(nodeId);
    return `opened ${ref.node.title ?? nodeId}`;
  },
});
