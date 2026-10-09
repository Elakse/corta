import { blockRegistry } from "../registry";
import type { ContentNode, Course, Evaluation, Semester } from "../content/types";
import { walkBlocks } from "../content/build";
import { root, type PNode } from "./engine";

/** Own content size of a node from its blocks (each block's `size`, default 1). Containers count 0. */
export function ownSize(n: ContentNode): number {
  if (n.container) return 0;
  let s = 0;
  walkBlocks(n, (type, props) => {
    const def = blockRegistry.get(type);
    s += def?.size?.(props) ?? 1;
  });
  return Math.max(0.5, Math.round(s * 10) / 10);
}

const cache = new WeakMap<object, PNode>();

export function toPNode(n: ContentNode): PNode {
  const hit = cache.get(n);
  if (hit) return hit;
  const p: PNode = { id: n.id, container: n.container, ownSize: ownSize(n), weight: n.weight, children: n.children.map(toPNode) };
  cache.set(n, p);
  return p;
}

export function evaluationTree(ev: Evaluation): PNode | undefined {
  if (!ev.content) return undefined;
  const hit = cache.get(ev);
  if (hit) return hit;
  const p = root(`eval:${ev.key}`, ev.content.topics.map(toPNode));
  cache.set(ev, p);
  return p;
}

export function courseTree(c: Course): PNode {
  const hit = cache.get(c);
  if (hit) return hit;
  const p = root(`course:${c.key}`, c.evaluations.flatMap((e) => evaluationTree(e) ?? []));
  cache.set(c, p);
  return p;
}

export function semesterTree(s: Semester): PNode {
  const hit = cache.get(s);
  if (hit) return hit;
  const p = root(`semester:${s.id}`, s.courses.map(courseTree));
  cache.set(s, p);
  return p;
}
