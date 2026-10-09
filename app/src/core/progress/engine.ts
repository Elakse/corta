/**
 * Progress engine (pure). Semantics (architecture.md §6):
 *  - only each node's own flag is stored; containers have no own flag;
 *  - complete(n) = (container || own) && every child complete;
 *  - partial(n)  = not complete, but something in the subtree is done;
 *  - checking a node sets its whole subtree; checking a child only affects its subtree;
 *  - progress % is weighted: effective weight = derived content size × optional `weight` multiplier.
 * Higher levels (evaluation, course, semester) are synthetic container roots over the same trees.
 */

export interface PNode {
  id: string;
  container: boolean;
  /** size of the node's own content (excluding children); 0 for containers */
  ownSize: number;
  /** optional relevance multiplier from content (`weight`) */
  weight?: number;
  children: PNode[];
}

export type Flags = ReadonlySet<string>;
export type Status = "done" | "partial" | "none";

export function isComplete(n: PNode, flags: Flags): boolean {
  return (n.container || flags.has(n.id)) && n.children.every((c) => isComplete(c, flags));
}

export function isTouched(n: PNode, flags: Flags): boolean {
  return (!n.container && flags.has(n.id)) || n.children.some((c) => isTouched(c, flags));
}

export function status(n: PNode, flags: Flags): Status {
  if (isComplete(n, flags)) return "done";
  return isTouched(n, flags) ? "partial" : "none";
}

/** Ids of every trackable (non-container) node in the subtree. */
export function trackableIds(n: PNode, out: string[] = []): string[] {
  if (!n.container) out.push(n.id);
  for (const c of n.children) trackableIds(c, out);
  return out;
}

export interface FlagChange {
  set: string[];
  unset: string[];
}

/** Clicking a checkbox: complete → clear the subtree, otherwise → set the whole subtree. */
export function toggle(n: PNode, flags: Flags): FlagChange {
  return setSubtree(n, !isComplete(n, flags), flags);
}

export function setSubtree(n: PNode, on: boolean, flags: Flags): FlagChange {
  const ids = trackableIds(n);
  return on ? { set: ids.filter((id) => !flags.has(id)), unset: [] } : { set: [], unset: ids.filter((id) => flags.has(id)) };
}

export function applyChange(flags: Flags, change: FlagChange): Set<string> {
  const next = new Set(flags);
  change.set.forEach((id) => next.add(id));
  change.unset.forEach((id) => next.delete(id));
  return next;
}

/** Raw content size of a subtree (own + children). */
export function size(n: PNode): number {
  return n.ownSize + n.children.reduce((s, c) => s + effectiveWeight(c), 0);
}

/** Weight of a subtree among its siblings: its size times its relevance multiplier. */
export function effectiveWeight(n: PNode): number {
  return size(n) * (n.weight ?? 1);
}

/** Weighted completion in [0, 1]. */
export function progress(n: PNode, flags: Flags): number {
  if (isComplete(n, flags)) return 1;
  let total = 0, done = 0;
  if (!n.container && n.ownSize > 0) {
    total += n.ownSize;
    if (flags.has(n.id)) done += n.ownSize;
  }
  for (const c of n.children) {
    const w = effectiveWeight(c);
    total += w;
    done += w * progress(c, flags);
  }
  return total > 0 ? done / total : 0;
}

/** Synthetic container root (evaluation / course / semester level). */
export function root(id: string, children: PNode[], weight?: number): PNode {
  return { id, container: true, ownSize: 0, weight, children };
}

/** Remaining work in weight units (for priority strategies). */
export function remaining(n: PNode, flags: Flags): number {
  return effectiveWeight(n) * (1 - progress(n, flags));
}
