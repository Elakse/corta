import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { motion } from "motion/react";
import { useUi } from "@/state/ui";
import { kindRegistry } from "@/core/registry";
import type { OvNode } from "./model";
import { useSize } from "./useSize";
import { MathText } from "@/ui/MathText";

/** Disk-usage style map: area = weight, fill = progress. Two levels (topics → their parts). */
export function Treemap({ tree }: { tree: OvNode }) {
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const scrollTo = useUi((s) => s.scrollTo);
  // two levels: topics → their direct parts (each part's area includes its whole subtree)
  const data: OvNode = {
    ...tree,
    children: tree.children.map((t) => ({
      ...t,
      children: t.children.length
        ? [...t.children.map((c) => ({ ...c, children: [] })), ...(t.own > 0 ? [{ ...t, id: `${t.id}#own`, children: [], weight: t.own }] : [])]
        : [],
    })),
  };
  const root = hierarchy<OvNode>(data)
    .sum((d) => (d.children.length ? 0 : Math.max(d.weight, 0.01)))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  if (width > 0) treemap<OvNode>().tile(treemapSquarify.ratio(1.4)).size([width, height]).paddingInner(4).paddingTop((d) => (d.depth === 1 ? 26 : 0)).round(true)(root);
  const nodes = width > 0 ? root.descendants().filter((d) => d.depth > 0) : [];
  return (
    <div ref={ref} className="tm">
      {nodes.map((d, i) => {
        const r = d as typeof d & { x0: number; x1: number; y0: number; y1: number };
        const w = r.x1 - r.x0, h = r.y1 - r.y0;
        const topic = d.depth === 1;
        const p = d.data.progress;
        return (
          <motion.button
            key={d.data.id}
            type="button"
            className={`tm-cell${topic ? " tm-topic" : ""}`}
            data-status={d.data.status}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, left: r.x0, top: r.y0, width: w, height: h }}
            transition={{ duration: 0.45, delay: i * 0.012, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ ["--p" as string]: p }}
            title={`${d.data.title} · ${Math.round(p * 100)}%`}
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(d.data.id.replace(/#own$/, ""));
            }}
          >
            {!topic && <span className="tm-fill" />}
            {(topic || (w > 54 && h > 30)) && (
              <span className="tm-label">
                {!topic && <i>{kindRegistry.get(d.data.kind)?.glyph}</i>}
                <MathText text={d.data.title} />
              </span>
            )}
            {topic && <span className="tm-pct">{Math.round(p * 100)}%</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
