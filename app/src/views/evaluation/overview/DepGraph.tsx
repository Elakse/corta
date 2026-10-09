import { useMemo } from "react";
import { ReactFlow, Background, type Edge, type Node, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Evaluation } from "@/core/content";
import { useGraph } from "@/core/content";
import { useUi } from "@/state/ui";
import { kindRegistry } from "@/core/registry";
import { useT } from "@/i18n";
import type { OvNode } from "./model";

/** Dependencies (relations) between nodes of this evaluation, laid out in layers (prerequisites first). */
export default function DepGraph({ tree }: { evaluation: Evaluation; tree: OvNode }) {
  const graph = useGraph();
  const scrollTo = useUi((s) => s.scrollTo);
  const t = useT();
  const { nodes, edges } = useMemo(() => {
    const byId = new Map<string, OvNode>();
    const walk = (n: OvNode) => {
      byId.set(n.id, n);
      n.children.forEach(walk);
    };
    tree.children.forEach(walk);
    const rel = graph.edges.filter((e) => byId.has(e.from) && byId.has(e.to));
    const ids = new Set(rel.flatMap((e) => [e.from, e.to]));
    // layer = longest prerequisite chain ending at the node (edge from→to means "from relates to to")
    const level = new Map<string, number>();
    const lvl = (id: string, seen = new Set<string>()): number => {
      if (level.has(id)) return level.get(id)!;
      if (seen.has(id)) return 0;
      seen.add(id);
      const preds = rel.filter((e) => e.from === id && e.type === "prerequisite").map((e) => e.to);
      const v = preds.length ? 1 + Math.max(...preds.map((p) => lvl(p, seen))) : 0;
      level.set(id, v);
      return v;
    };
    ids.forEach((id) => lvl(id));
    const rows = new Map<number, number>();
    const nodes: Node[] = [...ids].map((id) => {
      const l = level.get(id) ?? 0;
      const r = rows.get(l) ?? 0;
      rows.set(l, r + 1);
      const n = byId.get(id)!;
      return {
        id,
        position: { x: l * 240, y: r * 74 },
        data: { label: `${kindRegistry.get(n.kind)?.glyph ?? ""} ${n.title}` },
        className: `dg-node s-${n.status}`,
      };
    });
    const edges: Edge[] = rel.map((e, i) => ({
      id: `e${i}`,
      source: e.to,
      target: e.from,
      label: e.type === "prerequisite" ? undefined : e.type,
      className: `dg-edge t-${e.type}`,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      animated: e.type === "prerequisite",
    }));
    return { nodes, edges };
  }, [graph.edges, tree]);

  if (!nodes.length) return <div className="ov-empty">{t("overview.noRelations")}</div>;
  return (
    <div className="dg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => scrollTo(n.id)}
        minZoom={0.3}
      >
        <Background gap={30} size={1} />
      </ReactFlow>
    </div>
  );
}
