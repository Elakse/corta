import { describe, expect, it } from "vitest";
import { layoutForWidth, layoutGraph, type GraphLayout, type LayoutOptions } from "./layout";
import { focusSets, hasCycle } from "./focus";
import { parseMermaid } from "./mermaid";
import type { Direction, GraphSpec } from "./types";

const measure: LayoutOptions["measure"] = (t) => t.length * 7.5;

const NETWORK = `flowchart LR
  s((s)) -->|1| x1((x1))
  s -->|1| x2((x2))
  s -->|1| x3((x3))
  x1 -->|1| y1((y1))
  x1 -->|1| y2((y2))
  x2 -->|1| y1
  x3 -->|1| y3((y3))
  y1 -->|1| t((t))
  y2 -->|1| t
  y3 -->|1| t`;

const parse = (code: string): GraphSpec => {
  const spec = parseMermaid(code);
  expect(spec).not.toBeNull();
  return spec!;
};

describe("responsive diagrams", () => {
  it("fits a branching tree by reducing empty space without shrinking its nodes", () => {
    const spec = parse("flowchart LR\n O((Start)) --> A[Left branch]\n O --> B[Right branch]\n A -->|1/2| C([C])\n A -->|1/2| D([D])\n B -->|1/2| E([E])\n B -->|1/2| F([F])");
    const normal = layoutGraph({ ...spec, direction: "TB" }, { measure });
    const narrow = layoutForWidth(spec, { measure }, 338);
    expect(narrow.direction).toBe("TB");
    expect(narrow.width * .85).toBeLessThanOrEqual(338);
    expect(narrow.nodes.map(n => [n.id, n.w, n.h])).toEqual(normal.nodes.map(n => [n.id, n.w, n.h]));
    expect(narrow.edges).toHaveLength(spec.edges.length);
  });
  it("reflows a long chain without changing any node or edge", () => {
    const spec = parse("flowchart LR\n A[First] --> B[Second] --> C[Third] --> D[Fourth]");
    const wide = layoutForWidth(spec, { measure }, 1200);
    const narrow = layoutForWidth(spec, { measure }, 220);
    expect(wide.direction).toBe("LR");
    expect(narrow.direction).toBe("TB");
    expect(narrow.width * .85).toBeLessThanOrEqual(220);
    expect(narrow.nodes.map(n => n.id)).toEqual(wide.nodes.map(n => n.id));
    expect(narrow.edges.map(e => [e.from, e.to])).toEqual(wide.edges.map(e => [e.from, e.to]));
  });
});

describe("parseMermaid", () => {
  it("preserves TeX and inequalities in quoted labels", () => {
    const graph = parse(String.raw`flowchart LR
      A["$F_X^{-1}(u)$"] -->|"$P(X<y)$"| B["plain code_name"]`);
    expect(graph.nodes[0]!.label).toBe(String.raw`$F_X^{-1}(u)$`);
    expect(graph.edges[0]!.label).toBe("$P(X<y)$");
  });
  it("uses the complete Mermaid fallback for self-loops", () => {
    expect(parseMermaid('flowchart LR\n A[A] -->|"$p$"| A')).toBeNull();
  });
  it("reads a flow network", () => {
    const g = parse(NETWORK);
    expect(g.direction).toBe("LR");
    expect(g.nodes.map((n) => n.id)).toEqual(["s", "x1", "x2", "x3", "y1", "y2", "y3", "t"]);
    expect(g.nodes.every((n) => n.shape === "circle")).toBe(true);
    expect(g.edges).toHaveLength(10);
    expect(g.edges[0]).toEqual({ from: "s", to: "x1", label: "1" });
  });

  it("reads quoted labels, <br/>, dotted links, inline link text and TD", () => {
    const g = parse(`flowchart TD
      R(("raíz<br/>l = 16")) --> A(("l = 14"))
      B -.->|"9 ≤ 12: poda"| X["✗"]
      H1{"¿monto > 1000?"} -- sí --> R1[20%]
      3SAT ==> IS["Independent set"]`);
    expect(g.direction).toBe("TB");
    expect(g.nodes.find((n) => n.id === "R")).toMatchObject({ label: "raíz\nl = 16", shape: "circle" });
    expect(g.nodes.find((n) => n.id === "H1")).toMatchObject({ label: "¿monto > 1000?", shape: "diamond" });
    expect(g.edges).toContainEqual({ from: "B", to: "X", label: "9 ≤ 12: poda", style: "dashed" });
    expect(g.edges).toContainEqual({ from: "H1", to: "R1", label: "sí" });
    expect(g.edges).toContainEqual({ from: "3SAT", to: "IS", style: "strong" });
  });

  it("chains and plain lines", () => {
    const g = parse("flowchart LR\n A --> B --- C");
    expect(g.edges).toEqual([{ from: "A", to: "B" }, { from: "B", to: "C", arrow: false }]);
  });

  it("keeps conditional-probability bars inside quoted edge labels", () => {
    const g = parse('flowchart LR\n O((Ω)) -->|"P(B₁)"| B1[B₁]\n B1 -->|"P(A|B₁)"| A1([A])');
    expect(g.edges).toEqual([
      { from: "O", to: "B1", label: "P(B₁)" },
      { from: "B1", to: "A1", label: "P(A|B₁)" },
    ]);
    expect(parseMermaid('flowchart LR\n A -->|"P(A|B)| B')).toBeNull();
  });

  it("reads state diagrams with start/end pseudo-states", () => {
    const g = parse(`stateDiagram-v2
      direction LR
      [*] --> Cerrada
      Cerrada --> Abierta: insertarTarjeta / acceso concedido
      Abierta --> [*]`);
    expect(g.direction).toBe("LR");
    expect(g.nodes.map((n) => n.shape)).toEqual(["start", "rect", "rect", "end"]);
    expect(g.edges[1]).toEqual({ from: "Cerrada", to: "Abierta", label: "insertarTarjeta / acceso concedido" });
  });

  it("returns null for what it does not understand, so Mermaid draws it", () => {
    expect(parseMermaid("classDiagram\n A <|-- B")).toBeNull();
    expect(parseMermaid("sequenceDiagram\n A->>B: hi")).toBeNull();
    expect(parseMermaid("flowchart LR\n subgraph x\n A-->B\n end")).toBeNull();
    expect(parseMermaid("flowchart LR\n A & B --> C")).toBeNull();
    expect(parseMermaid("flowchart LR\n A --> B\n style A fill:#f00")).toBeNull();
    expect(parseMermaid("flowchart LR\n A[(db)] --> B")).toBeNull();
    expect(parseMermaid("stateDiagram-v2\n state X {\n A --> B\n }")).toBeNull();
  });
});

it("reserves measured formula heights for nodes and edge labels", () => {
  const spec = parse('flowchart LR\n A["$a/b$\\n$F_X$"] -->|"$p$"| B[B]');
  const normal = layoutGraph(spec, { measure });
  const tall = layoutGraph(spec, { measure, measureHeight: (_text, kind) => kind === "node" ? 40 : 32 });
  expect(tall.nodes[0]!.h).toBeGreaterThan(normal.nodes[0]!.h);
  expect(tall.edges[0]!.label!.h).toBeGreaterThan(normal.edges[0]!.label!.h);
  expect(tall.nodes[0]!.lineHeights.every(height => height === 40)).toBe(true);
});

type P = [number, number];
const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
/** points along every cubic of an SVG path made of one M and several C commands */
function samplePath(d: string): P[] {
  const n = nums(d);
  const out: P[] = [];
  let cur: P = [n[0]!, n[1]!];
  out.push(cur);
  for (let i = 2; i + 5 < n.length + 0; i += 6) {
    const [c1x, c1y, c2x, c2y, x, y] = n.slice(i, i + 6) as number[];
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      const u = 1 - t;
      out.push([u ** 3 * cur[0] + 3 * u * u * t * c1x! + 3 * u * t * t * c2x! + t ** 3 * x!, u ** 3 * cur[1] + 3 * u * u * t * c1y! + 3 * u * t * t * c2y! + t ** 3 * y!]);
    }
    cur = [x!, y!];
  }
  return out;
}

const inBox = (l: GraphLayout["nodes"][number], [x, y]: P, m = 0) => Math.abs(x - l.x) < l.w / 2 + m && Math.abs(y - l.y) < l.h / 2 + m;

function checkLayout(spec: GraphSpec, dir?: Direction) {
  const l = layoutGraph({ ...spec, direction: dir ?? spec.direction }, { measure });
  // nothing leaves the canvas
  for (const n of l.nodes) {
    expect(n.x - n.w / 2).toBeGreaterThanOrEqual(0);
    expect(n.y - n.h / 2).toBeGreaterThanOrEqual(0);
    expect(n.x + n.w / 2).toBeLessThanOrEqual(l.width + 0.5);
    expect(n.y + n.h / 2).toBeLessThanOrEqual(l.height + 0.5);
  }
  // nodes never overlap
  for (const [i, a] of l.nodes.entries())
    for (const b of l.nodes.slice(i + 1))
      expect(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2, `${a.id} overlaps ${b.id}`).toBe(true);
  // a curve never runs through a node that is not one of its ends
  for (const e of l.edges)
    for (const n of l.nodes) {
      if (n.id === e.from || n.id === e.to) continue;
      expect(samplePath(e.d).some((pt) => inBox(n, pt)), `edge ${e.from}→${e.to} crosses ${n.id}`).toBe(false);
    }
  return l;
}

describe("layoutGraph", () => {
  const network = parse(NETWORK);

  it("lays a flow network in columns (s, x, y, t) with ordered, non-overlapping nodes", () => {
    const l = checkLayout(network);
    const x = (id: string) => l.nodes.find((n) => n.id === id)!.x;
    expect(x("s")).toBeLessThan(x("x1"));
    expect(x("x1")).toBe(x("x2"));
    expect(x("x2")).toBeLessThan(x("y1"));
    expect(x("y3")).toBeLessThan(x("t"));
    expect(l.edges.every((e) => e.arrow && e.label?.lines[0] === "1")).toBe(true);
  });

  it.each(["LR", "RL", "TB", "BT"] as const)("works in direction %s", (dir) => {
    const l = checkLayout(network, dir);
    const first = l.nodes.find((n) => n.id === "s")!, last = l.nodes.find((n) => n.id === "t")!;
    if (dir === "LR") expect(first.x).toBeLessThan(last.x);
    if (dir === "RL") expect(first.x).toBeGreaterThan(last.x);
    if (dir === "TB") expect(first.y).toBeLessThan(last.y);
    if (dir === "BT") expect(first.y).toBeGreaterThan(last.y);
    if (dir === "TB" || dir === "BT") expect(l.nodes.find((n) => n.id === "x1")!.y).toBe(l.nodes.find((n) => n.id === "x2")!.y);
  });

  it("routes edges that skip layers around the nodes in between", () => {
    const g = parse(`flowchart LR
      A --> B --> C --> D
      A -->|largo| D
      A --> C`);
    checkLayout(g);
  });

  it("handles cycles and 2-cycles: parallel edges bow apart and labels do not collide", () => {
    const g = parse(`stateDiagram-v2
      direction LR
      [*] --> Cerrada
      Cerrada --> Abierta: insertarTarjeta / acceso concedido
      Abierta --> Cerrada: cerrar
      Cerrada --> Bloqueada: intentos fallidos`);
    const l = checkLayout(g);
    const [a, b] = l.edges.filter((e) => e.label && ["insertarTarjeta / acceso concedido", "cerrar"].includes(e.label.lines.join("\n")));
    expect(a && b).toBeTruthy();
    const overlap = Math.abs(a!.label!.x - b!.label!.x) < (a!.label!.w + b!.label!.w) / 2 && Math.abs(a!.label!.y - b!.label!.y) < (a!.label!.h + b!.label!.h) / 2;
    expect(overlap).toBe(false);
    expect(l.edges.some((e) => e.reversed)).toBe(true);
  });

  it("copes with disconnected graphs, empty graphs, unknown ids and self-loops", () => {
    expect(() => layoutGraph({ nodes: [], edges: [] }, { measure })).not.toThrow();
    const l = layoutGraph({ nodes: [{ id: "a", label: "a" }, { id: "b", label: "b" }], edges: [{ from: "a", to: "a" }, { from: "a", to: "zzz" }] }, { measure });
    expect(l.edges).toHaveLength(0);
    expect(l.nodes).toHaveLength(2);
  });

  it("draws multi-line labels taller than single-line ones", () => {
    const l = layoutGraph({ nodes: [{ id: "a", label: "uno\ndos\ntres" }, { id: "b", label: "uno" }], edges: [] }, { measure });
    expect(l.nodes[0]!.h).toBeGreaterThan(l.nodes[1]!.h);
  });
});

describe("focusSets", () => {
  const g = parse(NETWORK);
  it("a node lights every path through it", () => {
    const f = focusSets(g, { kind: "node", id: "x1" });
    expect([...f.nodes].sort()).toEqual(["s", "t", "x1", "y1", "y2"]);
    expect(f.edges.size).toBe(5); // s→x1, x1→y1, x1→y2, y1→t, y2→t
  });
  it("an edge lights itself and its ends", () => {
    const f = focusSets(g, { kind: "edge", index: 0 });
    expect([...f.nodes].sort()).toEqual(["s", "x1"]);
    expect([...f.edges]).toEqual([0]);
  });
  it("graphs with cycles light only direct neighbours", () => {
    const c = parse("stateDiagram-v2\n A --> B\n B --> C\n C --> A\n C --> D");
    expect(hasCycle(c)).toBe(true);
    expect([...focusSets(c, { kind: "node", id: "A" }).nodes].sort()).toEqual(["A", "B", "C"]);
  });
});
