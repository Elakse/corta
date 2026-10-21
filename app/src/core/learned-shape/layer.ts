/**
 * The learned-shape layer: owns the SVG elements of every learned node's outline and their animations
 * (Web Animations API, no library). Framework-agnostic; the notebook's margin layer feeds it positions
 * and the set of nodes that should currently show a shape. Spec: docs/learned-shape-port.md.
 *
 *  - fill  → path in the full-sheet SVG that sits UNDER the ruled frame (rules and text draw over it);
 *  - patch → paper + wash rects hiding the frame's border where the tab crosses it   } in the ink SVG, above the
 *  - ink   → the green loop (drawn on with pathLength=1)                              } frame, under the checkboxes.
 */
import { shapePaths, type ShapePos } from "./geometry";

const NS = "http://www.w3.org/2000/svg";
export const SHAPE_EASE = "cubic-bezier(.2, .8, .2, 1)";
const LEAVE_EASE = "cubic-bezier(.4, 0, .2, 1)";

/** True when the user asked for no motion: shapes still show, they just don't animate. */
export const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Shape {
  id: string;
  fill: SVGPathElement;
  patch: SVGGElement;
  ink: SVGPathElement;
  leaving: boolean;
}

export interface ShapeLayerOptions {
  /** full-sheet SVG under the frame */
  fill: SVGElement;
  /** SVG at the start of the margin layer (above the frame, under the checkboxes) */
  ink: SVGElement;
  /** checkbox corner radius (px) */
  checkboxRadius: number;
}

export interface ShapeLayer {
  /** Replaces the measured positions (and the rule unit) and re-lays out every shape. Cheap; call after each ruler pass. */
  update(positions: ReadonlyMap<string, ShapePos>, unit: number): void;
  /** Shows shapes for exactly `wanted`. New ones enter, removed ones leave; animated only when `animate` (and motion is allowed). */
  sync(wanted: ReadonlySet<string>, animate: boolean): void;
  /** Ids that currently have a (non-leaving) shape. */
  ids(): string[];
  dispose(): void;
}

function make<K extends "path" | "g" | "rect">(tag: K, cls: string | null, parent: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  if (cls) e.setAttribute("class", cls);
  parent.append(e);
  return e;
}

export function createShapeLayer({ fill, ink, checkboxRadius }: ShapeLayerOptions): ShapeLayer {
  const shapes = new Map<string, Shape>();
  let positions: ReadonlyMap<string, ShapePos> = new Map();
  let unit = 30;

  const place = (s: Shape) => {
    const pos = positions.get(s.id);
    if (!pos) return;
    const g = shapePaths(pos, unit, checkboxRadius);
    s.fill.setAttribute("d", g.d);
    s.ink.setAttribute("d", g.d);
    for (const r of Array.from(s.patch.children)) {
      r.setAttribute("x", String(g.patch.x));
      r.setAttribute("y", String(g.patch.y));
      r.setAttribute("width", String(g.patch.w));
      r.setAttribute("height", String(g.patch.h));
    }
  };

  const drop = (s: Shape) => {
    s.fill.remove();
    s.patch.remove();
    s.ink.remove();
    if (shapes.get(s.id) === s) shapes.delete(s.id);
  };

  const create = (id: string, animate: boolean) => {
    const s: Shape = {
      id,
      leaving: false,
      fill: make("path", "learned-fill", fill),
      patch: make("g", null, ink),
      ink: null as unknown as SVGPathElement,
    };
    make("rect", "learned-patch", s.patch);
    make("rect", "learned-patch-wash", s.patch);
    s.ink = make("path", "learned-ink", ink);
    s.ink.setAttribute("pathLength", "1");
    shapes.set(id, s);
    place(s);
    if (animate && !calm()) {
      const o: KeyframeAnimationOptions = { duration: 900, easing: SHAPE_EASE, fill: "backwards" };
      s.ink.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { ...o, delay: 60 });
      s.fill.animate([{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { ...o, duration: 720, delay: 140 });
      s.patch.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 140, fill: "backwards" });
    }
  };

  const leave = (s: Shape, animate: boolean) => {
    s.leaving = true;
    // never placed (no position yet / hidden in a closed solution): nothing to animate out
    if (!animate || calm() || !s.ink.getAttribute("d")) return drop(s);
    const o: KeyframeAnimationOptions = { duration: 300, easing: LEAVE_EASE, fill: "forwards" };
    s.ink.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 1 }], o);
    s.patch.animate([{ opacity: 1 }, { opacity: 0 }], o);
    s.fill.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 100% 0 0)" }], o).onfinish = () => drop(s);
  };

  return {
    update(next, u) {
      positions = next;
      unit = u;
      for (const s of shapes.values()) if (!s.leaving) place(s);
    },
    sync(wanted, animate) {
      for (const id of wanted) {
        const s = shapes.get(id);
        if (s && !s.leaving) continue;
        if (s) drop(s);
        create(id, animate);
      }
      for (const s of [...shapes.values()]) if (!s.leaving && !wanted.has(s.id)) leave(s, animate);
    },
    ids: () => [...shapes.values()].filter((s) => !s.leaving).map((s) => s.id),
    dispose() {
      for (const s of [...shapes.values()]) drop(s);
    },
  };
}
