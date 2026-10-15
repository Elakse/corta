import type { ComponentType } from "react";
import type { ZodType } from "zod";
import { createRegistry } from "./registry";
import type { VarValue } from "../content/schemas";

export type BlockGroup = "content" | "layout" | "visual" | "control" | "practice" | "freeform";

/** What a block component receives besides its props. */
export interface BlockContext {
  /** id of the node that owns this block */
  nodeId: string;
  /** address of the block inside the node (stable across renders) */
  path: string;
  /** directory of the evaluation (resolves canvas modules and images) */
  evaluationDir: string;
  language: string;
}

export interface BlockComponentProps<P> {
  props: P;
  ctx: BlockContext;
}

/** Live state given to `describe` (for the LLM context). */
export interface DescribeState {
  vars: Record<string, VarValue>;
}

export interface BlockDef<P = any> {
  type: string;
  version: number;
  group: BlockGroup;
  /** validates the YAML props the agent writes */
  schema: ZodType<P>;
  component: ComponentType<BlockComponentProps<P>>;
  /** shared page variables this block consumes */
  reads?: (props: P) => string[];
  /** shared page variables this block changes */
  writes?: (props: P) => string[];
  /** plain-text summary for the LLM context */
  describe: (props: P, state: DescribeState) => string;
  /** usage guide for the generation skill (Markdown) */
  docs: string;
  /** a YAML example (body item) for the catalog */
  example: string;
  /**
   * How the ruler handles it: "self" = the block marks its own line holders (data-rl="text|math|table"),
   * "snap" = the renderer wraps it and rounds its height up to whole lines.
   */
  ruler: "self" | "snap";
  /**
   * The reader manipulates it (drags, sliders, 3D orbit, inputs): its text can't be selected, so a drag never
   * turns into a text selection, and the selection menu ignores it.
   */
  interactive?: boolean;
  /** draw it as a taped card (only for snapped blocks) */
  card?: boolean;
  /** the block draws its own solid `Surface` card: the renderer only adds the spacing around it (snapped blocks) */
  surface?: boolean;
  /** nested body lists (blocks only), for validation, sizing and describe */
  children?: (props: P) => unknown[][];
  /** inline-markup strings the block renders (validated for the tall-math rule and {{var}} placeholders) */
  markup?: (props: P) => string[];
  /** Math-capable labels outside ruled prose: syntax is validated; the view measures their height. */
  labels?: (props: P) => string[];
  /** relative content size of the block itself (default 1); feeds derived weights */
  size?: (props: P) => number;
}

export const blockRegistry = createRegistry<BlockDef>("blocks", (d) => d.type);

/** Identity helper that keeps the props type inferred from the schema. */
export function defineBlock<P>(def: BlockDef<P>): BlockDef<P> {
  return def;
}
