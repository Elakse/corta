import { useMemo } from "react";
import { useGraph } from "@/core/content/store";
import { setSubtree, status as statusOf, toggle as toggleOf, toPNode, progress as progressOf, type PNode, type Status } from "@/core/progress";
import { useProgress } from "./progress";

/** Progress status and actions for one node (by id). */
export function useNodeProgress(nodeId: string): { status: Status; pct: number; toggle: () => void; setDone: (on: boolean) => void } {
  const ref = useGraph().nodes.get(nodeId);
  const done = useProgress((s) => s.done);
  const apply = useProgress((s) => s.apply);
  return useMemo(() => {
    if (!ref) return { status: "none" as Status, pct: 0, toggle: () => undefined, setDone: () => undefined };
    const p = toPNode(ref.node);
    return {
      status: statusOf(p, done),
      pct: progressOf(p, done),
      toggle: () => apply(toggleOf(p, useProgress.getState().done)),
      setDone: (on: boolean) => apply(setSubtree(p, on, useProgress.getState().done)),
    };
  }, [ref, done, apply]);
}

/** Weighted progress of any progress tree (evaluation, course, semester roots). */
export function useTreeProgress(tree: PNode | undefined): number {
  const done = useProgress((s) => s.done);
  return useMemo(() => (tree ? progressOf(tree, done) : 0), [tree, done]);
}
