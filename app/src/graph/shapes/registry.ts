import { createRegistry } from "@/core/registry";

export interface Box {
  w: number;
  h: number;
}

/**
 * A node outline. Extending the diagrams with a new shape = adding `<name>.shape.ts` in this folder that
 * default-exports a `defineShape(...)`; the layout and the view never switch on the shape key.
 */
export interface ShapeDef {
  key: string;
  /** node box that fits a text block of the given size */
  size(text: Box): Box;
  /** distance from the center to the outline along `axis`, measured on a line `offset` px off-center on the other axis */
  halfExtent(box: Box, axis: "x" | "y", offset: number): number;
  /** SVG path of the outline, centered on (0, 0) */
  path(box: Box): string;
  /** extra decoration paths (drawn with the `deco` class) */
  deco?(box: Box): string[];
  /** extra CSS class on the node (e.g. "filled") */
  className?: string;
  /** the shape carries no text */
  noLabel?: boolean;
}

export const shapeRegistry = createRegistry<ShapeDef>("graph-shapes", (d) => d.key);

export const defineShape = (def: ShapeDef): ShapeDef => def;

const f = (n: number) => +n.toFixed(2);

/** Rounded-rectangle outline path (rx clamped to half the shorter side). */
export function roundedRectPath({ w, h }: Box, rx: number): string {
  const r = Math.min(rx, w / 2, h / 2), x = w / 2, y = h / 2;
  return `M${f(-x + r)},${f(-y)} H${f(x - r)} A${f(r)},${f(r)} 0 0 1 ${f(x)},${f(-y + r)} V${f(y - r)} A${f(r)},${f(r)} 0 0 1 ${f(x - r)},${f(y)} H${f(-x + r)} A${f(r)},${f(r)} 0 0 1 ${f(-x)},${f(y - r)} V${f(-y + r)} A${f(r)},${f(r)} 0 0 1 ${f(-x + r)},${f(-y)} Z`;
}

export function circlePath(r: number): string {
  return `M${f(-r)},0 A${f(r)},${f(r)} 0 1 0 ${f(r)},0 A${f(r)},${f(r)} 0 1 0 ${f(-r)},0 Z`;
}
