/**
 * Rich text: Markdown + KaTeX ($inline$, $$display$$) + ==highlight== + inline code + {{var}} interpolation.
 * Output HTML marks every line holder for the ruler: paragraphs, list items and headings get
 * data-rl="text", display formulas get data-rl="math".
 */
import { Marked, type TokenizerAndRendererExtension, type Tokens } from "marked";
import katex from "katex";

export function renderTex(tex: string, display: boolean): string {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml" });
}

/** Display formula wrapped as a ruler math holder. */
export function displayMathHtml(tex: string): string {
  return `<div class="rl-math" data-rl="math"><div class="rl-math-inner">${renderTex(tex, true)}</div></div>`;
}

const inlineMath: TokenizerAndRendererExtension = {
  name: "inlineMath",
  level: "inline",
  start: (src) => {
    const i = src.search(/(?<!\\)\$/);
    return i < 0 ? undefined : i;
  },
  tokenizer(src) {
    const m = /^\$((?:\\.|[^\\$\n])+?)\$/.exec(src);
    if (m) return { type: "inlineMath", raw: m[0], text: m[1]! };
    return undefined;
  },
  renderer: (t) => `<span class="rl-imath">${renderTex((t as Tokens.Generic).text as string, false)}</span>`,
};

const blockMath: TokenizerAndRendererExtension = {
  name: "blockMath",
  level: "block",
  start: (src) => {
    const i = src.indexOf("$$");
    return i < 0 ? undefined : i;
  },
  tokenizer(src) {
    const m = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src);
    if (m) return { type: "blockMath", raw: m[0], text: m[1]!.trim() };
    return undefined;
  },
  renderer: (t) => displayMathHtml((t as Tokens.Generic).text as string),
};

const highlight: TokenizerAndRendererExtension = {
  name: "highlight",
  level: "inline",
  start: (src) => {
    const i = src.indexOf("==");
    return i < 0 ? undefined : i;
  },
  tokenizer(src) {
    const m = /^==(?=\S)([\s\S]*?\S)==/.exec(src);
    if (m) return { type: "highlight", raw: m[0], text: m[1]!, tokens: this.lexer.inlineTokens(m[1]!) };
    return undefined;
  },
  renderer(t) {
    return `<mark>${this.parser.parseInline((t as Tokens.Generic).tokens ?? [])}</mark>`;
  },
};

const marked = new Marked({
  gfm: true,
  breaks: false,
  extensions: [blockMath, inlineMath, highlight],
  renderer: {
    paragraph({ tokens }) {
      return `<p data-rl="text">${this.parser.parseInline(tokens)}</p>`;
    },
    heading({ tokens, depth }) {
      const level = Math.min(6, depth + 2);
      return `<h${level} class="rl-h" data-rl="text">${this.parser.parseInline(tokens)}</h${level}>`;
    },
    listitem(item) {
      // tight items: inline only; loose items would nest <p> (we keep one holder per item)
      const inner = item.tokens.map((t) => ("tokens" in t && t.tokens ? this.parser.parseInline(t.tokens) : this.parser.parse([t]))).join("");
      return `<li data-rl="text">${inner}</li>`;
    },
    code({ text }) {
      const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return `<pre class="rl-pre" data-rl="text"><code>${esc}</code></pre>`;
    },
    link({ href, tokens }) {
      return `<a href="${href}" target="_blank" rel="noreferrer">${this.parser.parseInline(tokens)}</a>`;
    },
  },
});

/** Block-level Markdown → HTML with ruler holders. */
export function renderMarkdown(src: string): string {
  return marked.parse(src, { async: false }) as string;
}

/** Inline-only Markdown (table cells, labels) → HTML, no wrapping paragraph. */
export function renderInline(src: string): string {
  return marked.parseInline(src, { async: false }) as string;
}

/** Plain text approximation (for describe() and search). */
export function toPlain(src: string): string {
  return src
    .replace(/\$\$([\s\S]+?)\$\$/g, " [$1] ")
    .replace(/\*\*|__|==|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
