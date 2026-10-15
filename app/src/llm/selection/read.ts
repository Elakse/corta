/**
 * Turns a DOM selection on a study page into plain text the tutor can read. Rendered formulas are
 * replaced by their LaTeX source (KaTeX keeps it in a MathML annotation), so "Explain" sees $\lambda$,
 * not the glyph soup that copying rendered math produces.
 */

const MAX_CHARS = 4000;
const BLOCK = new Set(["P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "TR", "BLOCKQUOTE", "SECTION", "DIV", "UL", "OL", "TABLE"]);

const elementOf = (n: Node) => (n instanceof Element ? n : n.parentElement);

/** Grows the range so it never cuts a formula in half (half a formula has no LaTeX to recover). */
function wholeFormulas(range: Range): Range {
  const r = range.cloneRange();
  const start = elementOf(r.startContainer)?.closest(".katex-display, .katex");
  const end = elementOf(r.endContainer)?.closest(".katex-display, .katex");
  if (start) r.setStartBefore(start);
  if (end) r.setEndAfter(end);
  return r;
}

const texOf = (el: Element) => el.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();

function toText(node: Node, out: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push(node.textContent ?? "");
    return;
  }
  if (!(node instanceof Element) && !(node instanceof DocumentFragment)) return;
  if (node instanceof Element) {
    if (node.getAttribute("aria-hidden") === "true" && !node.classList.contains("katex-html")) return;
    if (node.classList.contains("katex-display") || node.classList.contains("katex")) {
      const tex = texOf(node);
      const display = node.classList.contains("katex-display");
      out.push(tex ? (display ? `\n$$${tex}$$\n` : `$${tex}$`) : node.textContent ?? "");
      return;
    }
    if (node.tagName === "BR") {
      out.push("\n");
      return;
    }
  }
  const block = node instanceof Element && BLOCK.has(node.tagName);
  if (block) out.push("\n");
  for (const child of node.childNodes) toText(child, out);
  if (block) out.push("\n");
  if (node instanceof Element && (node.tagName === "TD" || node.tagName === "TH")) out.push("\t");
}

export function selectionText(range: Range): string {
  const out: string[] = [];
  toText(wholeFormulas(range).cloneContents(), out);
  const text = out
    .join("")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}…` : text;
}

/** Innermost study node that contains the whole selection. */
export function selectionNodeId(range: Range): string | null {
  return elementOf(range.commonAncestorContainer)?.closest<HTMLElement>("[data-node]")?.dataset.node ?? null;
}
