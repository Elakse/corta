/**
 * Layered graph layout. Pure: no DOM, text measurement is injected, so it is unit-testable.
 *
 *   1. break cycles (DFS) so every edge points "forward"
 *   2. layers by longest path
 *   3. long edges get one invisible lane item per layer they cross, so a curve can never run through a node
 *   4. order each layer to cut crossings (barycenter sweeps)
 *   5. place: cross-axis by iterated neighbour averaging, along-axis by layer columns (gaps grow for edge labels)
 *   6. ports: attachments spread along each node's outline, ordered to avoid crossings at the node
 *   7. curves: every segment leaves and arrives along the flow axis, so lines are flat at nodes and lanes
 *
 * Everything is computed in an abstract frame (p = along the flow, q = across it) and mapped to the screen at the
 * end by `Direction`, so LR / RL / TB / BT share all the code.
 */
import type { Direction, GraphEdge, GraphNode, GraphSpec } from "./types";
import { shapeRegistry, type Box, type ShapeDef } from "./shapes";

export type TextKind = "node" | "chip";
export interface LayoutOptions {
  /** width in px of one line of text, in the font used for that kind */
  measure: (text: string, kind: TextKind) => number;
}

export const NODE_LINE = 18;
export const CHIP_LINE = 14;
const CHIP_PAD_X = 16, CHIP_PAD_Y = 8;
const PAD = 28, ARROW = 8, PORT_GAP = 12, LANE = 14;

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  shape: string;
  path: string;
  deco: string[];
  className?: string;
  tone?: string;
  noLabel: boolean;
  layer: number;
}

export interface PlacedEdge {
  index: number;
  from: string;
  to: string;
  /** SVG path data */
  d: string;
  /** arrowhead polygon, or null for a plain line */
  arrow: string | null;
  label?: { lines: string[]; x: number; y: number; w: number; h: number };
  style: string;
  /** the edge closes a cycle (drawn like the rest; the arrowhead sits at the other end of the curve) */
  reversed: boolean;
  layer: number;
}

export interface GraphLayout {
  width: number;
  height: number;
  direction: Direction;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

interface Pt { p: number; q: number }
interface Port { e: E; at: Item; pt?: Pt }
interface Item {
  real: boolean;
  node?: GraphNode;
  shape?: ShapeDef;
  box?: Box;
  lines?: string[];
  /** size along / across the flow */
  a: number;
  c: number;
  layer: number;
  p: number;
  q: number;
  want: number;
  ins: Port[];
  outs: Port[];
}
interface Chip { lines: string[]; w: number; h: number }
interface E {
  index: number;
  spec: GraphEdge;
  a: Item;
  b: Item;
  rev: boolean;
  src: Item;
  dst: Item;
  chain: Item[];
  /** cross-axis offset of the middle waypoint (parallel edges between the same two nodes) */
  bow: number;
  chip?: Chip;
  pts: Pt[];
}

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const round = (n: number) => Math.round(n * 10) / 10;

export function layoutGraph(spec: GraphSpec, opts: LayoutOptions): GraphLayout {
  const direction = spec.direction ?? "LR";
  const vertical = direction === "TB" || direction === "BT";
  const mirrored = direction === "RL" || direction === "BT";
  const alongAxis = vertical ? "y" : "x";
  const rect = shapeRegistry.require("rect");

  // ---- items ----
  const byId = new Map<string, Item>();
  const nodes: Item[] = [];
  for (const n of spec.nodes) {
    if (byId.has(n.id)) continue;
    const shape = shapeRegistry.get(n.shape ?? "rect") ?? rect;
    const lines = shape.noLabel ? [] : n.label.split("\n");
    const text = { w: Math.max(0, ...lines.map((l) => opts.measure(l, "node"))), h: lines.length * NODE_LINE };
    const box = shape.size(text);
    const it: Item = { real: true, node: n, shape, box, lines, a: vertical ? box.h : box.w, c: vertical ? box.w : box.h, layer: 0, p: 0, q: 0, want: 0, ins: [], outs: [] };
    byId.set(n.id, it);
    nodes.push(it);
  }
  const edges: E[] = [];
  spec.edges.forEach((se, index) => {
    const a = byId.get(se.from), b = byId.get(se.to);
    if (!a || !b || a === b) return; // unknown ids and self-loops are not drawn
    const e: E = { index, spec: se, a, b, rev: false, src: a, dst: b, chain: [], bow: 0, pts: [] };
    if (se.label) {
      const lines = se.label.split("\n");
      e.chip = { lines, w: Math.ceil(Math.max(...lines.map((l) => opts.measure(l, "chip")))) + CHIP_PAD_X, h: lines.length * CHIP_LINE + CHIP_PAD_Y };
    }
    edges.push(e);
  });
  const chipAlong = (e: E) => (e.chip ? (vertical ? e.chip.h : e.chip.w) : 0);
  const chipCross = (e: E) => (e.chip ? (vertical ? e.chip.w : e.chip.h) : 0);

  // ---- 1. break cycles ----
  const out = new Map<Item, E[]>(nodes.map((n) => [n, []]));
  edges.forEach((e) => out.get(e.a)!.push(e));
  const hasIn = new Set(edges.map((e) => e.b));
  const state = new Map<Item, number>();
  const dfs = (n: Item) => {
    state.set(n, 1);
    for (const e of out.get(n)!) {
      const s = state.get(e.b) ?? 0;
      if (s === 1) e.rev = true;
      else if (s === 0) dfs(e.b);
    }
    state.set(n, 2);
  };
  [...nodes.filter((n) => !hasIn.has(n)), ...nodes].forEach((n) => !state.get(n) && dfs(n));
  edges.forEach((e) => {
    e.src = e.rev ? e.b : e.a;
    e.dst = e.rev ? e.a : e.b;
  });

  // ---- 2. layers (longest path) ----
  for (let k = 0; k < nodes.length; k++) {
    let changed = false;
    for (const e of edges) if (e.dst.layer < e.src.layer + 1) { e.dst.layer = e.src.layer + 1; changed = true; }
    if (!changed) break;
  }

  // parallel edges between the same two adjacent nodes bow apart (A⇄B, repeated edges)
  const groups = new Map<string, E[]>();
  for (const e of edges) {
    if (e.dst.layer - e.src.layer !== 1) continue;
    const ids = [e.a.node!.id, e.b.node!.id].sort().join("\u0000");
    (groups.get(ids) ?? groups.set(ids, []).get(ids)!).push(e);
  }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const sep = Math.max(24, ...g.map((e) => chipCross(e) + 16));
    g.forEach((e, i) => (e.bow = (i - (g.length - 1) / 2) * sep));
  }

  // ---- 3. lanes for long edges + per-gap room for labels ----
  const items: Item[] = [...nodes];
  const succ = new Map<Item, Item[]>(), pred = new Map<Item, Item[]>();
  const link = (x: Item, y: Item) => {
    (succ.get(x) ?? succ.set(x, []).get(x)!).push(y);
    (pred.get(y) ?? pred.set(y, []).get(y)!).push(x);
  };
  const L = Math.max(0, ...nodes.map((n) => n.layer)) + 1;
  const baseGap = vertical ? 72 : 88;
  const gaps: number[] = Array.from({ length: Math.max(0, L - 1) }, () => baseGap);
  const labelRoom = chipAlongRoom(vertical);
  for (const e of edges) {
    e.chain = [e.src];
    for (let l = e.src.layer + 1; l < e.dst.layer; l++) {
      const d: Item = { real: false, a: 0, c: LANE, layer: l, p: 0, q: 0, want: 0, ins: [], outs: [] };
      items.push(d);
      e.chain.push(d);
    }
    e.chain.push(e.dst);
    for (let k = 0; k < e.chain.length - 1; k++) link(e.chain[k]!, e.chain[k + 1]!);
    if (!e.chip) continue;
    const segments = e.chain.length - 1 + (e.bow ? 1 : 0);
    if (segments % 2 === 0) {
      // the label sits on a lane (or on the waypoint of a bowed edge): reserve its cross size there
      const holder = e.bow ? null : e.chain[segments / 2]!;
      if (holder) holder.c = Math.max(holder.c, chipCross(e));
      else gaps[e.src.layer] = Math.max(gaps[e.src.layer]!, chipAlong(e) + labelRoom);
    } else {
      const l = e.chain[(segments - 1) / 2]!.layer;
      gaps[l] = Math.max(gaps[l]!, chipAlong(e) + labelRoom);
    }
  }
  const layers: Item[][] = Array.from({ length: L }, () => []);
  items.forEach((it) => layers[it.layer]!.push(it));

  // ---- 4. order ----
  const pos = new Map<Item, number>();
  const reindex = () => layers.forEach((l) => l.forEach((it, i) => pos.set(it, i)));
  const sweep = (l: number, nb: Map<Item, Item[]>) => {
    reindex();
    const key = new Map(layers[l]!.map((it) => [it, nb.get(it)?.length ? avg(nb.get(it)!.map((x) => pos.get(x)!)) : pos.get(it)!] as const));
    layers[l]!.sort((x, y) => key.get(x)! - key.get(y)! || pos.get(x)! - pos.get(y)!);
  };
  for (let it = 0; it < 8; it++) {
    for (let l = 1; l < L; l++) sweep(l, pred);
    for (let l = L - 2; l >= 0; l--) sweep(l, succ);
  }
  reindex();

  // ---- 5. place ----
  const crossGap = vertical ? 38 : 30;
  const sep = (x: Item, y: Item) => ((x.real ? crossGap : 10) + (y.real ? crossGap : 10)) / 2;
  for (const l of layers) {
    let q = 0;
    l.forEach((it, i) => { q += i ? sep(l[i - 1]!, it) : 0; it.q = q + it.c / 2; q += it.c; });
    const mid = q / 2;
    l.forEach((it) => (it.q -= mid));
  }
  const settle = (l: Item[], nb: Map<Item, Item[]>) => {
    if (!l.length) return;
    for (const it of l) it.want = nb.get(it)?.length ? avg(nb.get(it)!.map((x) => x.q)) : it.q;
    const fwd: number[] = [], bwd: number[] = [];
    let bottom = -Infinity;
    l.forEach((it, i) => {
      const top = Math.max(it.want - it.c / 2, bottom + (i ? sep(l[i - 1]!, it) : 0));
      fwd[i] = top + it.c / 2;
      bottom = top + it.c;
    });
    let top = Infinity;
    for (let i = l.length - 1; i >= 0; i--) {
      const it = l[i]!;
      const b = Math.min(it.want + it.c / 2, top - (i < l.length - 1 ? sep(it, l[i + 1]!) : 0));
      bwd[i] = b - it.c / 2;
      top = b - it.c;
    }
    l.forEach((it, i) => (it.q = (fwd[i]! + bwd[i]!) / 2)); // both passes keep the gaps, so their mean does too
  };
  for (let it = 0; it < 10; it++) {
    for (let l = 1; l < L; l++) settle(layers[l]!, pred);
    for (let l = L - 2; l >= 0; l--) settle(layers[l]!, succ);
  }
  let p = 0;
  layers.forEach((l, i) => {
    const w = Math.max(0, ...l.filter((x) => x.real).map((x) => x.a));
    for (const it of l) it.p = p + w / 2;
    p += w + (gaps[i] ?? 0);
  });

  // ---- 6. ports ----
  for (const e of edges) {
    e.src.outs.push({ e, at: e.chain[1]! });
    e.dst.ins.push({ e, at: e.chain[e.chain.length - 2]! });
  }
  for (const n of nodes) {
    for (const [list, side] of [[n.outs, 1], [n.ins, -1]] as const) {
      list.sort((x, y) => x.at.q + x.e.bow - (y.at.q + y.e.bow) || x.e.index - y.e.index);
      const k = list.length, gap = Math.min(PORT_GAP, (n.c * 0.62) / Math.max(1, k - 1));
      list.forEach((port, i) => {
        const dy = (i - (k - 1) / 2) * gap;
        port.pt = { p: n.p + side * n.shape!.halfExtent(n.box!, alongAxis, dy), q: n.q + dy };
      });
    }
  }

  // ---- 7. curves ----
  const lab = new Map<E, Pt>();
  for (const e of edges) {
    const s = e.src.outs.find((x) => x.e === e)!.pt!, d = e.dst.ins.find((x) => x.e === e)!.pt!;
    const mids: Pt[] = e.chain.slice(1, -1).map((m) => ({ p: m.p, q: m.q }));
    if (e.bow) mids.push({ p: (s.p + d.p) / 2, q: (s.q + d.q) / 2 + e.bow });
    e.pts = [s, ...mids, d];
    const n = e.pts.length - 1;
    if (e.chip)
      lab.set(e, n % 2 === 0 ? e.pts[n / 2]! : { p: (e.pts[(n - 1) / 2]!.p + e.pts[(n + 1) / 2]!.p) / 2, q: (e.pts[(n - 1) / 2]!.q + e.pts[(n + 1) / 2]!.q) / 2 });
  }

  // ---- bounds and screen mapping ----
  let minP = Infinity, maxP = -Infinity, minQ = Infinity, maxQ = -Infinity;
  const grow = (pp: number, qq: number, hp = 0, hq = 0) => {
    minP = Math.min(minP, pp - hp); maxP = Math.max(maxP, pp + hp);
    minQ = Math.min(minQ, qq - hq); maxQ = Math.max(maxQ, qq + hq);
  };
  for (const it of items) grow(it.p, it.q, it.a / 2, it.c / 2);
  for (const e of edges) {
    e.pts.forEach((pt) => grow(pt.p, pt.q));
    const at = lab.get(e);
    if (at) grow(at.p, at.q, chipAlong(e) / 2, chipCross(e) / 2);
  }
  if (!isFinite(minP)) { minP = maxP = minQ = maxQ = 0; }
  const P = maxP - minP + PAD * 2, Q = maxQ - minQ + PAD * 2;
  const T = (pt: Pt) => {
    const pp = pt.p - minP + PAD, qq = pt.q - minQ + PAD;
    const along = mirrored ? P - pp : pp;
    return vertical ? { x: qq, y: along } : { x: along, y: qq };
  };
  const num = (n: number) => String(round(n));

  const placedNodes: PlacedNode[] = nodes.map((it) => {
    const c = T(it), box = it.box!, shape = it.shape!;
    return {
      id: it.node!.id, x: round(c.x), y: round(c.y), w: box.w, h: box.h, lines: it.lines!, shape: shape.key,
      path: shape.path(box), deco: shape.deco?.(box) ?? [], className: shape.className, tone: it.node!.tone,
      noLabel: !!shape.noLabel, layer: it.layer,
    };
  });

  const placedEdges: PlacedEdge[] = edges.map((e) => {
    const pts = e.pts.map((pt) => ({ ...pt }));
    const arrowed = e.spec.arrow !== false;
    // the stroke stops at the arrow's base; the tip touches the node
    if (arrowed) { if (e.rev) pts[0]!.p += ARROW; else pts[pts.length - 1]!.p -= ARROW; }
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const x = pts[i]!, y = pts[i + 1]!, dp = Math.max(24, (y.p - x.p) * 0.5);
      const c1 = T({ p: x.p + dp, q: x.q }), c2 = T({ p: y.p - dp, q: y.q }), a = T(x), b = T(y);
      if (i === 0) d += `M${num(a.x)},${num(a.y)}`;
      d += ` C${num(c1.x)},${num(c1.y)} ${num(c2.x)},${num(c2.y)} ${num(b.x)},${num(b.y)}`;
    }
    let arrow: string | null = null;
    if (arrowed) {
      const tip = e.rev ? e.pts[0]! : e.pts[e.pts.length - 1]!, s = e.rev ? -1 : 1;
      const k = [tip, { p: tip.p - s * ARROW * 1.25, q: tip.q - 4.6 }, { p: tip.p - s * ARROW * 1.25, q: tip.q + 4.6 }].map(T);
      arrow = `M${num(k[0]!.x)},${num(k[0]!.y)} L${num(k[1]!.x)},${num(k[1]!.y)} L${num(k[2]!.x)},${num(k[2]!.y)}Z`;
    }
    const at = lab.get(e);
    const c = at ? T(at) : null;
    return {
      index: e.index, from: e.a.node!.id, to: e.b.node!.id, d, arrow, style: e.spec.style ?? "solid", reversed: e.rev, layer: e.src.layer,
      label: e.chip && c ? { lines: e.chip.lines, x: round(c.x), y: round(c.y), w: e.chip.w, h: e.chip.h } : undefined,
    };
  });

  return {
    width: round(vertical ? Q : P), height: round(vertical ? P : Q), direction,
    nodes: placedNodes, edges: placedEdges,
  };
}

/** extra along-axis room (px) around a label that sits between two layers */
function chipAlongRoom(vertical: boolean): number {
  return vertical ? 44 : 54;
}
