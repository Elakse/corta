/**
 * Learned-node shape geometry (pure). A learned node is ONE closed outline: a tab wrapping its checkbox,
 * continuing as a full-bleed band over the node. Spec: docs/learned-shape-port.md.
 *
 * Everything is derived from the rule unit `u`, the checkbox size and its corner radius:
 *  - p = (u - cb) / 2 is the gap between the checkbox and the tab edge; the tab is one line (`u`) tall;
 *  - r = checkboxRadius + p is EVERY radius (tab corners, band corners, concave joins): concentric on purpose.
 * All coordinates are px in the sheet's space (the margin layer's coordinate system).
 */

/** Where a node sits, measured by the layer after every ruler pass. */
export interface ShapePos {
  /** checkbox centre x */
  x: number;
  /** checkbox centre y */
  cy: number;
  /** checkbox size */
  cb: number;
  /** gap between checkbox and tab edge: (u - cb) / 2 */
  p: number;
  /** x of the centre of the frame's left border */
  fx: number;
  /** frame border width */
  bw: number;
  /** x of the centre of the frame's right border */
  right: number;
  /** bottom of the node */
  bottom: number;
  /** y half a line above a tall first line (heading), or null when the first line is a normal one */
  headroom: number | null;
}

export interface ShapePatch {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShapePaths {
  /** one closed counter-clockwise path, used for both the fill and the ink */
  d: string;
  /** rect that hides the frame's left border where the tab crosses it */
  patch: ShapePatch;
}

/** First lines at least this many rules tall get headroom (an "ear") when there is room. */
export const TALL_LINE = 1.5;
/** Distance between the checkbox column and the frame's left border centre, beyond the tab gap. */
export const FRAME_CLEARANCE = 6;

/** gap between the checkbox and the tab edge */
export const tabGap = (u: number, cb: number) => (u - cb) / 2;
/** the one radius of the whole outline */
export const shapeRadius = (checkboxRadius: number, p: number) => checkboxRadius + p;
/** true when a first line of this line-height needs headroom above it */
export const isTallLine = (lineHeight: number, u: number) => lineHeight >= TALL_LINE * u;

/** Checkbox centre x: deeper nodes sit closer to the frame. `step` is 14 on desktop, 9 on phones. */
export function checkboxX(depth: number, fx: number, cb: number, p: number, step: number): number {
  return fx - FRAME_CLEARANCE - p - cb / 2 - (2 - Math.min(depth, 2)) * step;
}

const f = (v: number) => +v.toFixed(2);

export function shapePaths(pos: ShapePos, u: number, checkboxRadius: number): ShapePaths {
  const { x, cy, cb, p, fx, bw, right, bottom, headroom } = pos;
  const r = shapeRadius(checkboxRadius, p);
  const tabTop = cy - u / 2;
  const tabBottom = cy + u / 2;
  const x0 = x - cb / 2 - p; // tab's left edge
  const ear = headroom !== null && tabTop - headroom >= 2 * r;
  const bandTop = ear ? headroom : tabTop;
  const bandBottom = Math.max(bottom + u / 2, tabBottom + 2 * r + 4);
  const arc = (sweep: 0 | 1, px: number, py: number) => `A${f(r)} ${f(r)} 0 0 ${sweep} ${f(px)} ${f(py)}`;

  const head = ear
    ? `M${f(fx + r)} ${f(bandTop)} ${arc(0, fx, bandTop + r)} V${f(tabTop - r)} ${arc(1, fx - r, tabTop)} H${f(x0 + r)} ${arc(0, x0, tabTop + r)}`
    : `M${f(fx)} ${f(tabTop)} H${f(x0 + r)} ${arc(0, x0, tabTop + r)}`;
  const d =
    `${head} V${f(tabBottom - r)} ${arc(0, x0 + r, tabBottom)} H${f(fx - r)} ${arc(1, fx, tabBottom + r)} ` +
    `V${f(bandBottom - r)} ${arc(0, fx + r, bandBottom)} H${f(right - r)} ${arc(0, right, bandBottom - r)} ` +
    `V${f(bandTop + r)} ${arc(0, right - r, bandTop)} Z`;

  const pad = r - 3;
  const y0 = tabTop - (ear ? pad : 0);
  return { d, patch: { x: fx - bw / 2 - 0.5, y: y0, w: bw + 1, h: tabBottom + pad - y0 } };
}
