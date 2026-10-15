# Mathematical notation in content and graphics

Write formulas explicitly as `$TeX$`. Text outside the delimiters remains literal, including code names
with underscores. Do not substitute ASCII notation or Unicode superscripts for a proper formula.
Existing prose, display formulas and table cells already use KaTeX; labels now use the same engine.

| Surface | Authoring |
|---|---|
| Node titles, pencil notes, control labels/units | `title: 'El modelo $(\Omega,\mathcal{A},P)$'` |
| Diagram nodes and arrows | Quote labels: `A["$F_X^{-1}(u)$"] -->|"$P(A\mid B)$"| B` |
| 2D / 3D point and vector labels | `label: '$\lambda_1$'` |
| Canvas labels at plane coordinates | `<kit.Label at={[x,y]}>{'$F_X$'}</kit.Label>` |
| Canvas controls, captions, readouts | `<kit.MathText text={'$E[X]$'} />` |
| Canvas labels at SVG pixel coordinates | `<kit.SvgMathLabel text={'$x_1$'} x={x} y={y} font={font} />` |

In TSX strings, escape backslashes (`'$\\lambda_1$'`) or use `String.raw`. In YAML, prefer single quotes
or a block scalar; double-quoted YAML needs doubled backslashes. Put TeX containing braces in a TSX
string expression, rather than raw JSX text. Escape a literal currency dollar as `\$`.

## Diagrams and measured labels

Both `$…$` and Mermaid's `$$…$$` label delimiters are accepted. The custom graph renderer draws
mixed prose/math with measured HTML labels inside SVG. It measures the actual KaTeX width **and
height** before placing nodes, edges and label chips. Fractions and limits may grow a diagram label;
the tall-inline prohibition applies to ruled prose and one-line controls, not these measured boxes.
Use `<br/>` between complete formulas or prose lines; never split a formula to fit a guessed width.

The Mermaid fallback normalizes formulas to its native double-dollar syntax and uses the same
KaTeX stylesheet. Native math support is documented for flowcharts and sequence diagrams:
[Mermaid math configuration](https://mermaid.ai/open-source/config/math.html). Class names, methods,
identifiers and code are literal programming notation; do not turn them into math automatically.

## Extending renderers

- `core/markup/labels.ts`: shared math delimiter reader, escaped label HTML, syntax checks.
- `ui/MathText.tsx`: HTML and SVG components; `ui/math-labels.ts`: cached browser measurements.
- `graph/layout.ts`: pure geometry; injected measurements include each label line's height.
- `graphics-kit`: exports `MathText` and `SvgMathLabel`; `Label` recognizes explicit math strings.
- Block definitions declare ruled inline strings in `markup`, and measured visual labels in `labels`.
  The loader checks TeX syntax for both; only `markup` is checked for tall inline constructs.

Use these components rather than sending TeX to raw SVG `<text>` or canvas `fillText`. Preserve font
sizes, theme colors, stable IDs and calculations when changing existing course labels. Test with fonts
loaded, light/dark themes and a 400px viewport; inspect full-size images as well as clipping checks.

## Verification

`npm run validate` checks course math syntax. `npm test` covers escaping, delimiters and measured
graph geometry. `tests/math-labels.spec.ts` verifies headings, controls, custom and fallback diagrams,
2D/3D labels and canvas labels. Graphics QA checks math errors and measured SVG label bounds.
The ruler suite must still pass after layout/content changes.
