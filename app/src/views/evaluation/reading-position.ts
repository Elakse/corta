/**
 * Where the reader is in a notebook, as an anchor (node id + pixel offset) rather than a raw scrollY:
 * lazy topics, ruler snapping and window size change the page's height, but node ids are stable.
 * Pure helpers; the hook that wires them to the page is `useReadingPosition.ts`.
 */

export interface ReadingAnchor {
  /** stable node id the reader is on */
  id: string;
  /** how far the node's top sits above the reading line (negative: below it), in px */
  offset: number;
}

/** A node's vertical extent on screen. */
export interface NodeBox {
  id: string;
  top: number;
  bottom: number;
}

/** Settings key holding one evaluation's saved anchor. */
export const readingKey = (evaluationKey: string) => `reading:${evaluationKey}`;

export function isAnchor(v: unknown): v is ReadingAnchor {
  if (typeof v !== "object" || v === null) return false;
  const a = v as Partial<ReadingAnchor>;
  return typeof a.id === "string" && typeof a.offset === "number" && Number.isFinite(a.offset);
}

/**
 * The node under the reading line: the innermost one containing it (latest top wins), else the nearest one
 * above it (the line sits in a gap). Null when nothing has started yet (the reader is at the page's top).
 * Containing beats nearest so a node's state (an opened solution…) above the line never shifts the anchor.
 */
export function pickAnchor(boxes: Iterable<NodeBox>, line: number): ReadingAnchor | null {
  let inside: NodeBox | null = null;
  let above: NodeBox | null = null;
  for (const b of boxes) {
    if (b.top > line + 0.5) continue;
    if (b.bottom > line) {
      if (!inside || b.top > inside.top) inside = b;
    } else if (!above || b.bottom > above.bottom) above = b;
  }
  const best = inside ?? above;
  return best ? { id: best.id, offset: Math.round(line - best.top) || 0 } : null;
}

/** How far to scroll so a node currently at `top` ends up where the anchor says. */
export const restoreDelta = (top: number, line: number, anchor: ReadingAnchor) => top - (line - anchor.offset);
