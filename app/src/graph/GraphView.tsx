import "./graph.css";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { focusSets, hasCycle } from "./focus";
import { layoutForWidth, type TextKind } from "./layout";
import { GRAPH_FONTS, graphFontsReady, measureText, measureTextHeight } from "./measure";
import { hasLabelMath } from "@/core/markup/labels";
import { SvgMathLabel } from "@/ui/MathText";
import type { FocusTarget, GraphSpec } from "./types";

function GraphLabels({ lines, heights, kind }: { lines: string[]; heights: number[]; kind: TextKind }) {
  let y = -heights.reduce((sum, height) => sum + height, 0) / 2;
  return lines.map((text, i) => {
    const height = heights[i]!;
    const center = y + height / 2;
    y += height;
    return hasLabelMath(text)
      ? <SvgMathLabel key={i} text={text} y={center} font={GRAPH_FONTS[kind]} anchor="middle" vertical="center" className={kind === "node" ? "lbl" : "chip-label"} />
      : <text key={i} className={kind === "node" ? "lbl" : undefined} y={center} dy=".35em">{text}</text>;
  });
}

/**
 * Draws a GraphSpec as SVG with the notebook's ink. Hover (or keyboard focus) on a node lights every path through
 * it, on an edge lights that edge. All colors come from tokens through graph.css; geometry comes from layoutGraph.
 */
export function GraphView({ spec, label }: { spec: GraphSpec; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  useLayoutEffect(() => {
    const el = wrap.current!;
    const measure = () => {
      const css = getComputedStyle(el);
      setAvailable(el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight));
    };
    let lastWidth = -1;
    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width !== lastWidth) {
        lastWidth = entry.contentRect.width;
        measure();
      }
    });
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  const [fonts, setFonts] = useState(0);
  useEffect(() => {
    let alive = true;
    graphFontsReady().then(() => alive && setFonts(1));
    return () => {
      alive = false;
    };
  }, []);
  const layout = useMemo(() => layoutForWidth(spec, { measure: measureText, measureHeight: measureTextHeight }, available), [spec, fonts, available]);
  const cyclic = useMemo(() => hasCycle(spec), [spec]);

  const [focus, setFocus] = useState<FocusTarget | null>(null);
  const on = useMemo(() => (focus ? focusSets(spec, focus, cyclic) : null), [spec, focus, cyclic]);

  // play the entrance once, when the diagram first comes into view
  const svg = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  // line lengths feed the "draw" animation (CSS can't read them)
  useLayoutEffect(() => {
    svg.current?.querySelectorAll<SVGPathElement>(".line").forEach((p) => p.style.setProperty("--len", String(Math.ceil(p.getTotalLength()))));
  }, [layout]);

  const w = layout.width, h = layout.height;
  return (
    <div className="gv-scroll surface-scroll" ref={wrap}>
      <svg
        ref={svg}
        className={`gv${seen ? " is-in" : ""}${on ? " is-focus" : ""}`}
        viewBox={`0 0 ${w} ${h}`}
        style={{ maxWidth: Math.round(w * 1.3), minWidth: Math.round(w * .85) }}
        data-direction={layout.direction}
        role="img"
        aria-label={label}
        onPointerLeave={() => setFocus(null)}
      >
        {layout.edges.map((e) => (
          <g
            key={e.index}
            className={`gv-edge edge-${e.style}${on?.edges.has(e.index) ? " on" : ""}`}
            style={{ "--l": e.layer } as CSSProperties}
            onPointerEnter={() => setFocus({ kind: "edge", index: e.index })}
          >
            <path className="hit" d={e.d} />
            <path className="line" d={e.d} />
            {e.arrow && <path className="arrow" d={e.arrow} />}
            {e.label && (
              <g className="chip" transform={`translate(${e.label.x},${e.label.y})`}>
                <rect x={-e.label.w / 2} y={-e.label.h / 2} width={e.label.w} height={e.label.h} rx={7} />
                <GraphLabels lines={e.label.lines} heights={e.label.lineHeights} kind="chip" />
              </g>
            )}
          </g>
        ))}
        {layout.nodes.map((n) => (
          <g
            key={n.id}
            className={`gv-node${n.className ? ` ${n.className}` : ""}${n.tone ? ` tone-${n.tone}` : ""}${on?.nodes.has(n.id) ? " on" : ""}`}
            style={{ "--l": n.layer } as CSSProperties}
            transform={`translate(${n.x},${n.y})`}
            tabIndex={0}
            onPointerEnter={() => setFocus({ kind: "node", id: n.id })}
            onFocus={() => setFocus({ kind: "node", id: n.id })}
            onBlur={() => setFocus(null)}
          >
            <path className="shape" d={n.path} />
            {n.deco.map((d, i) => <path key={i} className="deco" d={d} />)}
            {!n.noLabel && <GraphLabels lines={n.lines} heights={n.lineHeights} kind="node" />}
          </g>
        ))}
      </svg>
    </div>
  );
}
