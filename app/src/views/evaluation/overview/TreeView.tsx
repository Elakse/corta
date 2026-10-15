import { hierarchy, tree as d3tree } from "d3-hierarchy";
import { useUi } from "@/state/ui";
import { kindRegistry } from "@/core/registry";
import type { OvNode } from "./model";
import { useSize } from "./useSize";
import { hasLabelMath } from "@/core/markup/labels";
import { SvgMathLabel } from "@/ui/MathText";
import { fonts } from "@/theme";

const ROW = 22;
const COL = 190;

/** Containment as a horizontal tidy tree (evaluation → topics → … → exercises). */
export function TreeView({ tree }: { tree: OvNode }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const scrollTo = useUi((s) => s.scrollTo);
  const root = hierarchy(tree);
  const leaves = root.leaves().length;
  const depth = root.height;
  const height = Math.max(200, leaves * ROW);
  const w = Math.max(width - 40, depth * COL);
  d3tree<OvNode>().size([height, w - 180])(root);
  const nodes = root.descendants() as (ReturnType<typeof root.descendants>[number] & { x: number; y: number })[];
  return (
    <div ref={ref} className="ov-tree">
      <svg width={w + 20} height={height + 20}>
        <g transform="translate(14, 10)">
          {nodes.slice(1).map((n) => {
            const p = n.parent as typeof n;
            return <path key={`l-${n.data.id}`} className="tr-link" d={`M${p.y},${p.x} C${(p.y + n.y) / 2},${p.x} ${(p.y + n.y) / 2},${n.x} ${n.y},${n.x}`} />;
          })}
          {nodes.map((n) => (
            <g key={n.data.id} transform={`translate(${n.y},${n.x})`} className="tr-node" data-status={n.data.status} onClick={() => n.depth > 0 && scrollTo(n.data.id)}>
              <circle r={n.depth === 0 ? 6 : 4.5} />
              {hasLabelMath(n.data.title) ? <SvgMathLabel text={n.data.title} x={9} font={`500 12px ${fonts.display}`} color="var(--ink)" vertical="center" /> : <text x={9} dy="0.32em">
                {n.depth > 0 && <tspan className="tr-glyph">{kindRegistry.get(n.data.kind)?.glyph} </tspan>}
                {n.data.title.length > 34 ? `${n.data.title.slice(0, 33)}…` : n.data.title}
              </text>}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
