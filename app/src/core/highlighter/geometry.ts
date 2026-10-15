/**
 * Where things are on the page: readable pieces (text and whole formulas), the caret under a point and the
 * boxes covered by a range. Formulas are atoms: nothing ever points inside one.
 */

const ATOM = ".katex-display, .katex";
/** never read, hit or painted: interactive blocks and the hidden halves of rendered math */
const SKIP = "[data-interactive], .katex-mathml, svg.hl-ink, [aria-hidden='true']:not(.katex-html)";

export interface Caret {
  node: Node;
  offset: number;
}

export interface Box {
  rect: DOMRect;
  math: boolean;
  /** display formula: a line of its own */
  display: boolean;
  /** table row it belongs to: a row is always one stroke */
  row: Element | null;
}

export const elementOf = (n: Node | null): Element | null => (n ? (n instanceof Element ? n : n.parentElement) : null);

/** The whole formula a node belongs to (display wrapper first), if any. */
export function atomOf(n: Node | null): Element | null {
  const a = elementOf(n)?.closest(ATOM);
  return a ? a.closest(".katex-display") ?? a : null;
}

export const isSkipped = (root: Element, n: Node | null): boolean => {
  const e = elementOf(n);
  return !e || !root.contains(e) || !!e.closest(SKIP);
};

/** A formula's inked box: the union of its rendered parts (a display formula's own box spans the column). */
export function formulaBox(a: Element): DOMRect {
  const parts = a.querySelectorAll(".katex-html > .katex-base, .katex-html > .base");
  if (!parts.length) return (a.querySelector(".katex-html") ?? a).getBoundingClientRect();
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const p of parts) {
    const q = p.getBoundingClientRect();
    l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
  }
  return new DOMRect(l, t, r - l, b - t);
}

/** Walks text nodes and whole formulas under `root` that `accept` keeps. */
function walk(root: Node, visit: (n: Node, atom: boolean) => void, accept: (n: Node) => boolean = () => true) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!accept(n)) return NodeFilter.FILTER_REJECT;
      if (n instanceof Element) {
        if (n.matches(SKIP)) return NodeFilter.FILTER_REJECT;
        return n.matches(ATOM) && atomOf(n) === n ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
      return (n as Text).data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) visit(n, n instanceof Element);
}

interface Piece {
  node: Node;
  atom: boolean;
  rects: DOMRect[];
}

/** Readable pieces with their boxes; built lazily and dropped whenever the layout may have changed. */
export function createPieces(root: Element) {
  let cache: Piece[] | null = null;
  const all = () => {
    if (cache) return cache;
    const out: Piece[] = [];
    const r = document.createRange();
    walk(root, (n, atom) => {
      if (atom) return void out.push({ node: n, atom, rects: [formulaBox(n as Element)] });
      r.selectNodeContents(n);
      out.push({ node: n, atom, rects: [...r.getClientRects()].filter((q) => q.width > 0) });
    });
    return (cache = out);
  };
  return {
    all,
    reset: () => { cache = null; },
    first: (): Caret | null => { const p = all()[0]; return p ? { node: p.node, offset: 0 } : null; },
    last: (): Caret | null => { const p = all().at(-1); return p ? { node: p.node, offset: p.atom ? 0 : (p.node as Text).length } : null; },
  };
}
export type Pieces = ReturnType<typeof createPieces>;

function nativeCaret(x: number, y: number): Caret | null {
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = document.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/** Nearest readable position by geometry: margins, gaps between blocks, past a line's end. */
function nearestCaret(pieces: Pieces, x: number, y: number): Caret | null {
  let best: { p: Piece; r: DOMRect } | null = null;
  let bestD = Infinity;
  for (const p of pieces.all()) for (const r of p.rects) {
    const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    const d = dy * 4 + dx;
    if (d < bestD) { bestD = d; best = { p, r }; }
  }
  if (!best) return null;
  const { p, r } = best;
  if (p.atom) return { node: p.node, offset: 0 };
  const text = p.node as Text;
  const probe = document.createRange();
  let offset = 0, bestDx = Infinity;
  for (let i = 0; i <= text.length; i++) {
    probe.setStart(text, i); probe.setEnd(text, i);
    const q = probe.getClientRects()[0] ?? probe.getBoundingClientRect();
    if (q.bottom < r.top - 1 || q.top > r.bottom + 1) continue;
    const dx = Math.abs(q.left - x);
    if (dx < bestDx) { bestDx = dx; offset = i; }
  }
  return { node: text, offset };
}

/** The caret under a point inside `root`; above or below it clamps to its start or end. */
export function caretAt(root: Element, pieces: Pieces, x: number, y: number): Caret | null {
  const f = root.getBoundingClientRect();
  if (y < f.top) return pieces.first();
  if (y > f.bottom) return pieces.last();
  const p = nativeCaret(Math.min(f.right - 1, Math.max(f.left + 1, x)), y);
  if (p && !isSkipped(root, p.node) && (p.node.nodeType === Node.TEXT_NODE || atomOf(p.node))) return p;
  return nearestCaret(pieces, x, y);
}

/** Boxes of everything readable inside a range: clipped text pieces and whole formulas. */
export function rangeBoxes(root: Element, range: Range): Box[] {
  const out: Box[] = [];
  const r = document.createRange();
  const start = elementOf(range.commonAncestorContainer) ?? root;
  walk(start, (n, atom) => {
    const row = elementOf(n)?.closest("tr") ?? null;
    if (atom) return void out.push({ rect: formulaBox(n as Element), math: true, display: (n as Element).classList.contains("katex-display"), row });
    if (isSkipped(root, n)) return;
    const text = n as Text;
    const from = n === range.startContainer ? range.startOffset : 0;
    const to = n === range.endContainer ? range.endOffset : text.length;
    if (!text.data.slice(from, to).trim()) return;
    r.setStart(text, from); r.setEnd(text, to);
    for (const q of r.getClientRects()) if (q.width > 0.5) out.push({ rect: q, math: false, display: false, row });
  }, (n) => range.intersectsNode(n));
  return out;
}
