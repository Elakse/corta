import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ContentNode } from "@/core/content";
import { isComplete, toPNode } from "@/core/progress";
import { calm, checkboxX, createShapeLayer, isTallLine, tabGap, SHAPE_EASE, type ShapeLayer, type ShapePos } from "@/core/learned-shape";
import type { Ruler } from "@/core/ruler";
import { metrics } from "@/theme";
import { useNodeProgress } from "@/state/node-progress";
import { useProgress } from "@/state/progress";
import { useT } from "@/i18n";
import { usePage } from "./page-context";

interface Slot {
  box: HTMLButtonElement | null;
}

const Check = memo(function Check({ node, slots }: { node: ContentNode; slots: Map<string, Slot> }) {
  const t = useT();
  const { status, toggle } = useNodeProgress(node.id);
  const slot = slots.get(node.id) ?? { box: null };
  slots.set(node.id, slot);
  const label = node.title ?? node.id;
  return (
    <button
      type="button"
      role="checkbox"
      className="check"
      data-node-check={node.id}
      data-state={status === "done" ? "on" : status === "partial" ? "partial" : "off"}
      aria-checked={status === "done" ? "true" : status === "partial" ? "mixed" : "false"}
      aria-label={t("check.learned", { title: label })}
      title={label}
      ref={(el) => void (slot.box = el)}
      onClick={toggle}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path className="tick" d="M4.5 10.5 L8.5 14.2 L15.5 5.8" />
        <path className="dash" d="M5.5 10 H14.5" />
      </svg>
    </button>
  );
});

/**
 * The margin checklist: one checkbox per node, indented by depth (deeper = closer to the frame), sitting on the
 * node's first baseline (as measured by the ruler). A learned node (outermost learned only) is drawn as one closed
 * tab + band outline by core/learned-shape: the fill lives in `fill` (under the frame), the ink loop at the start
 * of this layer (above the frame, under the checkboxes).
 * Positions are applied imperatively after every ruler pass (cheap, no re-render).
 */
export function MarginLayer({
  nodes,
  ruler,
  sheet,
  fill,
}: {
  nodes: ContentNode[];
  ruler: Ruler | null;
  sheet: HTMLElement | null;
  /** the full-sheet SVG under the ruled frame */
  fill: SVGSVGElement | null;
}) {
  const page = usePage();
  const slots = useRef(new Map<string, Slot>()).current;
  const inkRef = useRef<SVGSVGElement>(null);
  const [shapes, setShapes] = useState<ShapeLayer | null>(null);
  const done = useProgress((s) => s.done);
  const seenSeq = useRef(useProgress.getState().userSeq);
  const wasOn = useRef(new Map<string, boolean>()).current;

  // the shape layer: created once both SVGs exist
  useLayoutEffect(() => {
    if (!fill || !inkRef.current) return;
    const layer = createShapeLayer({ fill, ink: inkRef.current, checkboxRadius: metrics.checkboxRadius });
    setShapes(layer);
    return () => {
      layer.dispose();
      setShapes(null);
    };
  }, [fill]);

  useEffect(() => {
    if (!ruler || !sheet) return;
    const frame = sheet.querySelector<HTMLElement>(".frame");
    if (!frame) return;
    const place = () => {
      const sr = sheet.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const narrow = matchMedia(`(max-width: ${metrics.phone.maxWidth}px)`).matches;
      const u = ruler.unit();
      const cb = narrow ? metrics.phone.checkbox : metrics.checkbox;
      const step = narrow ? metrics.phone.checkStep : metrics.checkStep;
      const p = tabGap(u, cb);
      const bw = parseFloat(getComputedStyle(frame).borderLeftWidth) || 0;
      const fx = fr.left - sr.left + bw / 2; // centre of the frame's left border
      const right = fr.right - sr.left - bw / 2;
      const o = ruler.origin();
      const positions = new Map<string, ShapePos>();
      for (const n of nodes) {
        const slot = slots.get(n.id);
        const el = page.nodeElement(n.id);
        if (!slot?.box || !el) continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0) {
          slot.box.style.display = "none";
          continue;
        }
        slot.box.style.display = "";
        const first = el.querySelector<HTMLElement>('[data-rl="text"]');
        const rel = first ? ruler.baselineOf(first) : undefined;
        const base = rel !== undefined ? o + rel : r.top + u - 3;
        const x = checkboxX(n.depth, fx, cb, p, step);
        const top = base - sr.top - cb + 3;
        slot.box.style.left = `${x}px`;
        slot.box.style.top = `${top}px`;
        const lineHeight = first ? parseFloat(getComputedStyle(first).lineHeight) || u : u;
        const lineTop = first ? first.getBoundingClientRect().top - sr.top - (parseFloat(first.style.top) || 0) : r.top - sr.top;
        positions.set(n.id, {
          x, cy: top + cb / 2, cb, p, fx, bw, right,
          bottom: r.bottom - sr.top,
          headroom: isTallLine(lineHeight, u) ? lineTop + u / 2 : null,
        });
      }
      shapes?.update(positions, u);
    };
    place();
    return ruler.onAligned(place);
  }, [ruler, sheet, nodes, page, slots, shapes]);

  // which shapes to show, and when to animate them: only for the user's own toggles (never on load or when topics mount)
  useLayoutEffect(() => {
    if (!shapes) return;
    const seq = useProgress.getState().userSeq;
    const animate = seq !== seenSeq.current;
    seenSeq.current = seq;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const memo = new Map<string, boolean>();
    const complete = (n: ContentNode) => {
      let c = memo.get(n.id);
      if (c === undefined) memo.set(n.id, (c = isComplete(toPNode(n), done)));
      return c;
    };
    const wanted = new Set<string>();
    for (const n of nodes) {
      const on = complete(n);
      const parent = n.parentId ? byId.get(n.parentId) : undefined;
      if (on && !(parent && complete(parent))) wanted.add(n.id);
      const box = slots.get(n.id)?.box;
      if (animate && on && !wasOn.get(n.id) && box && !calm()) {
        box.animate([{ scale: 1 }, { scale: 1.22, offset: 0.45 }, { scale: 1 }], { duration: 380, easing: SHAPE_EASE });
      }
      wasOn.set(n.id, on);
    }
    shapes.sync(wanted, animate);
  }, [shapes, nodes, done, slots, wasOn]);

  return (
    <div className="margin-layer">
      <svg className="shape-layer" ref={inkRef} aria-hidden="true" />
      {nodes.map((n) => (
        <Check key={n.id} node={n} slots={slots} />
      ))}
    </div>
  );
}
