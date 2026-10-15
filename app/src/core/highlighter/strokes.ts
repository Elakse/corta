/**
 * Pure geometry of the marker: boxes → one continuous stroke per visual line → SVG paths.
 * A stroke covers the letters (not the line box), splits only at real gaps such as side-by-side columns,
 * and keeps a table row in one piece.
 */
import type { Box } from "./geometry";

export interface Stroke {
  x0: number;
  x1: number;
  /** vertical center and height of the ink band */
  cy: number;
  h: number;
}

interface Line {
  top: number;
  bottom: number;
  display: boolean;
  items: Box[];
}

const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[xs.length >> 1]!;

export function strokesOf(boxes: Box[], fontPx: number): Stroke[] {
  const lines: Line[] = [];
  for (const b of boxes.slice().sort((a, c) => a.rect.top - c.rect.top || a.rect.left - c.rect.left)) {
    const mid = (b.rect.top + b.rect.bottom) / 2;
    const line = !b.display && lines.find((l) => !l.display && mid > l.top && mid < l.bottom);
    if (line) {
      line.items.push(b);
      line.top = Math.min(line.top, b.rect.top);
      line.bottom = Math.max(line.bottom, b.rect.bottom);
    } else lines.push({ top: b.rect.top, bottom: b.rect.bottom, display: b.display, items: [b] });
  }
  const out: Stroke[] = [];
  for (const l of lines) {
    const text = l.items.filter((i) => !i.math);
    let cy: number, h: number;
    if (text.length) {
      cy = median(text.map((i) => (i.rect.top + i.rect.bottom) / 2)) + fontPx * 0.06;
      h = median(text.map((i) => i.rect.height)) * 0.8;
      // tall inline math widens the stroke a little, never to the whole line
      for (const m of l.items) if (m.math) h = Math.max(h, Math.min(m.rect.height + 4, h * 1.35));
    } else {
      cy = (l.top + l.bottom) / 2;
      h = l.bottom - l.top + 8;
    }
    let cur: Stroke | null = null;
    let row: Element | null = null;
    for (const i of l.items.slice().sort((a, b) => a.rect.left - b.rect.left)) {
      if (cur && (i.rect.left - cur.x1 < fontPx * 1.4 || (i.row && i.row === row))) cur.x1 = Math.max(cur.x1, i.rect.right);
      else { cur = { x0: i.rect.left, x1: i.rect.right, cy, h }; row = i.row; out.push(cur); }
    }
  }
  return out;
}

const PAD = 2.5;

/** The band, with chisel ends (both lean, like a marker held at an angle). `ox/oy` = drawing origin. */
export function bandPath(s: Stroke, ox: number, oy: number): string {
  const slant = Math.min(4, s.h * 0.18);
  const x0 = s.x0 - ox - PAD, x1 = s.x1 - ox + PAD, top = s.cy - oy - s.h / 2, bot = top + s.h, mid = (top + bot) / 2;
  const n = (v: number) => Math.round(v * 10) / 10;
  return `M${n(x0 + slant)},${n(top)} L${n(x1 + slant * 0.4)},${n(top + 0.6)} Q${n(x1 + slant + 1.5)},${n(mid)} ${n(x1 - slant * 0.6)},${n(bot)} ` +
    `L${n(x0 - slant * 0.5)},${n(bot - 0.5)} Q${n(x0 - slant - 1.2)},${n(mid)} ${n(x0 + slant)},${n(top)} Z`;
}

/** Slightly darker ink along the top and bottom edges, where a real marker pools. */
export function edgePath(s: Stroke, ox: number, oy: number): string {
  const x0 = Math.round(s.x0 - ox + 0.5), x1 = Math.round(s.x1 - ox);
  const top = Math.round((s.cy - oy - s.h / 2 + 1.6) * 10) / 10, bot = Math.round((s.cy - oy + s.h / 2 - 1.6) * 10) / 10;
  return `M${x0},${top} L${x1},${top - 0.4} M${x0},${bot} L${x1},${bot + 0.4}`;
}
