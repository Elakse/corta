/** What a diagram is made of. Parsers (Mermaid today) produce it; the layout engine and the view consume it. */
export type Direction = "LR" | "RL" | "TB" | "BT";

export interface GraphNode {
  id: string;
  /** may hold several lines ("\n") */
  label: string;
  /** a key of the shape registry (graph/shapes). Default "rect". */
  shape?: string;
  /** purely visual: becomes the CSS class `tone-<tone>` (accent, ok, warn) */
  tone?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  /** becomes the CSS class `edge-<style>` (solid is the default; dashed, strong, muted) */
  style?: string;
  /** false draws a plain line without arrowhead */
  arrow?: boolean;
}

export interface GraphSpec {
  direction?: Direction;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Which element the pointer or keyboard focus is on. */
export type FocusTarget = { kind: "node"; id: string } | { kind: "edge"; index: number };
