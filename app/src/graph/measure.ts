import { fonts } from "@/theme";
import type { TextKind } from "./layout";
import { hasLabelMath } from "@/core/markup/labels";
import { mathFontsReady, measureLabel } from "@/ui/math-labels";

/** Fonts used by the diagram text (graph.css uses the same ones: layout widths must match what is drawn). */
export const GRAPH_FONTS: Record<TextKind, string> = {
  node: `600 14px ${fonts.display}`,
  chip: `500 11.5px ${fonts.mono}`,
};

let ctx: CanvasRenderingContext2D | null = null;

export function measureText(text: string, kind: TextKind): number {
  if (hasLabelMath(text)) return measureLabel(text, GRAPH_FONTS[kind]).width;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 7.5;
  ctx.font = GRAPH_FONTS[kind];
  return ctx.measureText(text).width;
}

export function measureTextHeight(text: string, kind: TextKind): number {
  return hasLabelMath(text) ? measureLabel(text, GRAPH_FONTS[kind]).height : kind === "node" ? 18 : 14;
}

/** Resolves once the diagram fonts are loaded, so the first layout is not measured with fallback fonts. */
export function graphFontsReady(): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.all([mathFontsReady(), ...Object.values(GRAPH_FONTS).map((f) => document.fonts.load(f).catch(() => []))]);
}
