import { z } from "zod";
import { useUi } from "@/state/ui";
import { evaluationUrl } from "@/domain/courses";
import { defineAction } from "../registry";
import { usePageBridge } from "../page-bridge";

export default defineAction({
  name: "navigateTo",
  description: "Scroll the study page to a node (definition, theorem, exercise…) by its id, opening its evaluation page if needed. Use it to show the user something related.",
  input: z.object({ nodeId: z.string().describe("a node id from the context") }),
  async run({ nodeId }, { graph, navigate }) {
    const ref = graph.nodes.get(nodeId);
    if (!ref) return `no node "${nodeId}"`;
    const ev = graph.evaluations.get(ref.evaluationKey)!;
    if (!location.pathname.endsWith(evaluationUrl(ev))) navigate(evaluationUrl(ev));
    const deadline = performance.now() + 5000;
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    while (usePageBridge.getState().evaluationKey !== ev.key && performance.now() < deadline) await nextFrame();
    if (usePageBridge.getState().evaluationKey !== ev.key) throw new Error("Study page did not open");
    useUi.getState().scrollTo(nodeId);
    let stable = 0;
    let lastY = window.scrollY;
    while (performance.now() < deadline && stable < 3) {
      await nextFrame();
      usePageBridge.getState().refresh?.();
      stable = useUi.getState().selected === nodeId && useUi.getState().visible[nodeId] && Math.abs(window.scrollY - lastY) < 1 ? stable + 1 : 0;
      lastY = window.scrollY;
    }
    if (stable < 3) throw new Error("Node did not become visible");
    return `scrolled to ${ref.node.title ?? nodeId}`;
  },
});
