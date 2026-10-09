import type { FocusTarget, GraphSpec } from "./types";

export interface FocusSets {
  nodes: Set<string>;
  edges: Set<number>;
}

const reach = (spec: GraphSpec, start: string, dir: "in" | "out"): Set<string> => {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of spec.edges) {
      const [from, to] = dir === "out" ? [e.from, e.to] : [e.to, e.from];
      if (from === cur && !seen.has(to)) {
        seen.add(to);
        stack.push(to);
      }
    }
  }
  return seen;
};

/** Does the graph contain a directed cycle? (state machines do; flow networks don't) */
export function hasCycle(spec: GraphSpec): boolean {
  const adj = new Map<string, string[]>();
  spec.edges.forEach((e) => (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to));
  const state = new Map<string, number>();
  const visit = (n: string): boolean => {
    state.set(n, 1);
    for (const m of adj.get(n) ?? []) {
      const s = state.get(m) ?? 0;
      if (s === 1 || (s === 0 && visit(m))) return true;
    }
    state.set(n, 2);
    return false;
  };
  return spec.nodes.some((n) => !state.get(n.id) && visit(n.id));
}

/**
 * What lights up when the pointer is on `target`.
 * - an edge: itself and its two nodes
 * - a node in an acyclic graph: every path through it (all ancestors and descendants)
 * - a node in a graph with cycles: the node and its direct neighbours (paths would be the whole cycle)
 */
export function focusSets(spec: GraphSpec, target: FocusTarget, cyclic = hasCycle(spec)): FocusSets {
  if (target.kind === "edge") {
    const e = spec.edges[target.index];
    return { nodes: new Set(e ? [e.from, e.to] : []), edges: new Set([target.index]) };
  }
  const id = target.id;
  if (cyclic) {
    const nodes = new Set([id]), edges = new Set<number>();
    spec.edges.forEach((e, i) => {
      if (e.from === id || e.to === id) { edges.add(i); nodes.add(e.from); nodes.add(e.to); }
    });
    return { nodes, edges };
  }
  const up = reach(spec, id, "in"), down = reach(spec, id, "out");
  const edges = new Set<number>();
  spec.edges.forEach((e, i) => {
    if ((up.has(e.from) && up.has(e.to)) || (down.has(e.from) && down.has(e.to))) edges.add(i);
  });
  return { nodes: new Set([...up, ...down]), edges };
}
