/**
 * Inline chips the tutor can write in an answer: `[[name:arg|arg]]`, rendered as small links.
 * Adding one = a file in chips/ (see docs/guides/add-llm-action.md).
 */
import type { ContentGraph } from "@/core/content";
import { createRegistry } from "@/core/registry";
import { renderMarkdown } from "@/core/markup";

export interface ChipContext {
  graph: ContentGraph;
  /** course the message belongs to ("<semester>/<course>"), fixed when it was sent */
  courseKey: string | null;
}

export interface ChipView {
  label: string;
  /** omitted = shown, not clickable (e.g. an unknown ref) */
  href?: string;
  title?: string;
}

export interface ChipDef {
  name: string;
  /** inline SVG (currentColor) */
  icon: string;
  resolve: (args: string[], ctx: ChipContext) => ChipView;
}

export const chipRegistry = createRegistry<ChipDef>("chat chips", (c) => c.name);
export const defineChip = (c: ChipDef) => c;

const CHIP = /\[\[([a-z][\w-]*):([^\]\n]+)\]\]/g;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function chipHtml(def: ChipDef, v: ChipView): string {
  const inner = `${def.icon}<span>${esc(v.label)}</span>`;
  const title = v.title ? ` title="${esc(v.title)}"` : "";
  return v.href
    ? `<a class="cchip cchip-${def.name}" href="${esc(v.href)}" target="_blank" rel="noopener"${title}>${inner}</a>`
    : `<span class="cchip cchip-${def.name} cchip-off"${title}>${inner}</span>`;
}

/** Markdown + KaTeX for a chat answer, with registered chips swapped in after rendering. */
export function renderChatMarkdown(text: string, ctx: ChipContext): string {
  const chips: string[] = [];
  const withTokens = text.replace(CHIP, (whole, name: string, raw: string) => {
    const def = chipRegistry.get(name);
    if (!def) return whole;
    chips.push(chipHtml(def, def.resolve(raw.split("|").map((a) => a.trim()), ctx)));
    return `CORTACHIP${chips.length - 1}Z`;
  });
  return renderMarkdown(withTokens).replace(/CORTACHIP(\d+)Z/g, (_, i: string) => chips[Number(i)] ?? "");
}
