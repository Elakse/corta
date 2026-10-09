import type { ContentNode, Evaluation } from "@/core/content";
import { effectiveWeight, progress, status, toPNode, type Flags, type Status } from "@/core/progress";

/** The overview's data: the same node tree with derived weight and progress (nothing stored twice). */
export interface OvNode {
  id: string;
  title: string;
  kind: string;
  weight: number;
  own: number;
  progress: number;
  status: Status;
  children: OvNode[];
}

export function overviewTree(ev: Evaluation, flags: Flags): OvNode {
  const make = (n: ContentNode): OvNode => {
    const p = toPNode(n);
    return {
      id: n.id,
      title: n.title ?? n.id.split("/").pop()!,
      kind: n.kind,
      weight: effectiveWeight(p),
      own: p.ownSize * (p.weight ?? 1),
      progress: progress(p, flags),
      status: status(p, flags),
      children: n.children.map(make),
    };
  };
  const topics = ev.content?.topics.map(make) ?? [];
  return { id: ev.key, title: ev.meta.title, kind: "evaluation", weight: topics.reduce((s, t) => s + t.weight, 0), own: 0, progress: 0, status: "none", children: topics };
}
