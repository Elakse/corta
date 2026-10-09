import { describe, expect, it } from "vitest";
import { findTallInlineMath, interpolate, placeholders, renderMarkdown, renderInline } from ".";

describe("markup", () => {
  it("finds and interpolates placeholders", () => {
    expect(placeholders("θ = {{theta}}° and {{ k }}")).toEqual(["theta", "k"]);
    expect(interpolate("θ = {{theta}}°", { theta: 20.456 })).toBe("θ = 20.46°");
  });
  it("flags tall inline math, ignores display math", () => {
    expect(findTallInlineMath("ok $x^2$ and $$\\frac{a}{b}$$")).toEqual([]);
    expect(findTallInlineMath("bad $\\frac{a}{b}$")[0]?.what).toMatch(/fractions/);
    expect(findTallInlineMath("bad $\\sum_{i=1}^k a_i$")).toHaveLength(1);
    expect(findTallInlineMath("bad $\\begin{pmatrix}1\\end{pmatrix}$")).toHaveLength(1);
  });
  it("marks line holders", () => {
    const html = renderMarkdown("Hola $x$ **mundo** ==clave==\n\n$$A v = \\lambda v$$\n\n- uno\n- dos");
    expect(html).toContain('<p data-rl="text">');
    expect(html).toContain('data-rl="math"');
    expect(html.match(/<li data-rl="text">/g)).toHaveLength(2);
    expect(html).toContain("<mark>");
    expect(html).toContain("katex");
  });
  it("renders inline without paragraphs", () => {
    expect(renderInline("$x$ y")).not.toContain("<p");
  });
});
