import { z } from "zod";
import { useUi } from "@/state/ui";
import { evaluationUrl } from "@/domain/courses";
import { defineAction } from "../registry";

export default defineAction({
  name: "navigateTo",
  description: "Scroll the study page to a node (definition, theorem, exercise…) by its id, opening its evaluation page if needed. Use it to show the user something related.",
  input: z.object({ nodeId: z.string().describe("a node id from the context") }),
  run({ nodeId }, { graph, navigate }) {
    const ref = graph.nodes.get(nodeId);
    if (!ref) return `no node "${nodeId}"`;
    const ev = graph.evaluations.get(ref.evaluationKey)!;
    if (!location.pathname.endsWith(evaluationUrl(ev))) navigate(evaluationUrl(ev));
    setTimeout(() => useUi.getState().scrollTo(nodeId), 120);
    return `scrolled to ${ref.node.title ?? nodeId}`;
  },
});
