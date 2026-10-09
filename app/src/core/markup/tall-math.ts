/**
 * The tall-math rule: inline math ($…$) must not stretch a ruled line. Constructs that are taller than a
 * line belong in a display `math` block. This finds violations so the validator can warn.
 */
const TALL = [
  { re: /\\begin\{(?:[pbvBV]?matrix|smallmatrix|array|cases|aligned|align\*?|gathered)\}/, what: "matrices/arrays/cases" },
  { re: /\\[dt]?frac\b|\\cfrac\b|\\over\b/, what: "fractions (\\frac)" },
  { re: /\\(?:sum|prod|coprod|bigcup|bigcap|int|iint|oint|lim|limsup|liminf|max|min|sup|inf)\s*(?:\\limits\s*)?[_^]/, what: "big operators with limits (\\sum_{…}^{…})" },
  { re: /\\binom\b|\\dbinom\b|\\stackrel\b|\\overset\b|\\underset\b|\\underbrace\b|\\overbrace\b/, what: "stacked constructs" },
  { re: /\\(?:big|Big|bigg|Bigg)[lr]?[()[\]|.]/, what: "big delimiters" },
];

export interface TallMathHit {
  tex: string;
  what: string;
}

/** Inline formulas ($…$, not $$…$$) in a Markdown string. */
export function inlineFormulas(src: string): string[] {
  const withoutDisplay = src.replace(/\$\$[\s\S]*?\$\$/g, " ");
  return [...withoutDisplay.matchAll(/(?<!\\)\$((?:\\.|[^\\$])+?)\$/g)].map((m) => m[1]!);
}

export function findTallInlineMath(src: string): TallMathHit[] {
  const hits: TallMathHit[] = [];
  for (const tex of inlineFormulas(src)) {
    const t = TALL.find((x) => x.re.test(tex));
    if (t) hits.push({ tex, what: t.what });
  }
  return hits;
}
