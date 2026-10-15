import { describe, expect, it } from "vitest";
import { hasLabelMath, labelParts, mermaidMath, renderLabel } from "./labels";

describe("math labels", () => {
  it("keeps literal prose/code and recognizes both math delimiters", () => {
    expect(labelParts("code_name: $x_1$ and $$x^2$$")).toEqual([
      { text: "code_name: ", math: false }, { text: "x_1", math: true },
      { text: " and ", math: false }, { text: "x^2", math: true },
    ]);
    expect(hasLabelMath("method_name(x), $5")).toBe(false);
    expect(labelParts(String.raw`cost \$5; $x$`)[0]).toEqual({ text: String.raw`cost \$5; `, math: false });
  });
  it("renders math with accessible KaTeX while escaping literal HTML", () => {
    const html = renderLabel(String.raw`<img src=x onerror=alert(1)> $F_X^{-1}(u)$`);
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).toContain('class="katex"');
    expect(html).toContain("<math");
    expect(html).not.toContain("katex-error");
  });
  it("preserves TeX operators and normalizes Mermaid fallback math once", () => {
    const code = String.raw`A["$P(A\mid B)$"] -->|"$$\frac{1}{3}$$"| B`;
    const normalized = mermaidMath(code);
    expect(normalized).toBe(String.raw`A["$$P(A\mid B)$$"] -->|"$$\frac{1}{3}$$"| B`);
    expect(mermaidMath(normalized)).toBe(normalized);
  });
});
