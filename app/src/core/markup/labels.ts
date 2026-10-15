/** Math in labels is explicit: prose stays literal, $…$ / $$…$$ contains TeX. */
import { renderTex } from "./render";
import katex from "katex";

export interface LabelPart { text: string; math: boolean }
export function labelParts(text: string): LabelPart[] {
  const parts: LabelPart[] = [];
  const pattern = /(?<!\\)(\$\$|\$)((?:\\.|[^\\$])+?)\1/g;
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > start) parts.push({ text: text.slice(start, match.index), math: false });
    parts.push({ text: match[2]!, math: true });
    start = match.index! + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start), math: false });
  return parts;
}
export const hasLabelMath = (text: string) => labelParts(text).some(part => part.math);
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function renderLabel(text: string): string {
  return labelParts(text).map(part => part.math ? renderTex(part.text, false) : escape(part.text).replace(/\\\$/g, "$" )).join("");
}
/** Mermaid's fallback uses its native double-dollar math syntax. */
export function mermaidMath(text: string): string {
  return labelParts(text).map(part => part.math ? `$$${part.text}$$` : part.text).join("");
}

export function labelMathErrors(text: string): string[] {
  return labelParts(text).filter(part => part.math).flatMap(part => {
    try { katex.renderToString(part.text, { throwOnError: true, trust: false, strict: "ignore" }); return []; }
    catch (error) { return [error instanceof Error ? error.message : String(error)]; }
  });
}
