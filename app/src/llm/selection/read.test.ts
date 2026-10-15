// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/core/markup";
import { selectionNodeId, selectionText } from "./read";

function page(html: string) {
  document.body.innerHTML = html;
  return document.body;
}

describe("selection reading", () => {
  it("returns formulas as LaTeX, even when the selection cuts through them", () => {
    const body = page(`<section data-node="n/1"><div class="md">${renderMarkdown("Sea $\\lambda$ un autovalor:\n\n$$Av = \\lambda v$$\n\nfin.")}</div></section>`);
    const range = document.createRange();
    const first = body.querySelector("p")!.firstChild!;
    range.setStart(first, 0);
    const lastKatexText = [...body.querySelectorAll(".katex-display .katex-html *")].at(-1)!;
    range.setEnd(lastKatexText, 0);
    const text = selectionText(range);
    expect(text).toContain("Sea $\\lambda$ un autovalor:");
    expect(text).toContain("$$Av = \\lambda v$$");
    expect(selectionNodeId(range)).toBe("n/1");
  });
});
