# Add a block

A block is a visual component the content can use (`{ <type>: props }`). Adding one = **adding a folder**.
Nothing else in the codebase changes: `app/src/blocks/index.ts` discovers it, the validator, catalog, LLM
context and renderer all read the registry.

## 1. Scaffold

```powershell
npm run new-block -- timeline --group visual --snap
```

Creates `app/src/blocks/timeline/index.tsx` (the definition) and `View.tsx` (the component).

## 2. Fill the definition (`index.tsx`)

```ts
export default defineBlock<Props>({
  type: "timeline",           // the YAML key
  version: 1,                 // bump when props change incompatibly (and migrate content)
  group: "visual",            // content | layout | visual | control | practice | freeform
  schema,                     // Zod: validates the YAML; use .strict() and .default() generously
  component: lazy(() => import("./View")),   // lazy for heavy libraries, direct import for light ones
  ruler: "snap",              // "snap" (height rounded to whole lines) or "self" (you mark line holders)
  card: true,                 // snapped blocks only: draw as a taped card
  reads: (p) => [...],        // page variables consumed (validator checks they're declared)
  writes: (p) => [...],       // page variables changed
  markup: (p) => [...],       // inline-markup strings it renders (tall-math rule + {{var}})
  children: (p) => [p.body],  // nested block lists (layout blocks)
  size: () => 1,              // relative content size (feeds weights); default 1
  describe: (p, s) => "…",    // one line for the LLM context (s.vars = live variable values)
  docs: `…`,                  // when and how the skill should use it (goes to the catalog)
  example: `- timeline: …`,   // a valid YAML body item (a unit test validates every example)
});
```

## 3. The ruler contract

Every line of text must sit on a rule. Pick one:

- **Snapped** (`ruler: "snap"`): the renderer wraps the block and rounds its height up to whole lines. Use for
  graphics, cards, controls. Text *inside* a snapped block isn't aligned (it's on a card).
- **Surface** (`ruler: "snap"` + `surface: true`): the block draws its own `Surface` (`@/ui/Surface`), a solid card
  that hides the ruled paper (code, tables, diagrams use it). The renderer only adds the spacing around it.
- **Line holder** (`ruler: "self"`): mark each element that holds text:
  - `data-rl="text"` on paragraphs/labels/code; its `line-height` must be a multiple of `var(--u)`.
  - `data-rl="math"` on a wrapper around a display KaTeX formula (use `displayMathHtml()` from `core/markup`).
  - `data-rl="table"` on a wrapper around a `<table>`.
  Vertical margins must be multiples of `var(--u)`. Render inline Markdown/math with `renderMarkdown` /
  `renderInline` from `core/markup` (they mark holders and keep inline math from stretching lines).

## 4. Interactivity

Read/write page variables with `useVar(name)`, `useVarValues(names)`, `useSetVar()` from `core/vars`, and declare
them in `reads`/`writes`. Use theme tokens for every color (`useTokens()` or `var(--token)`); never hardcode.

If the reader manipulates the block (drag, slider, orbit, typing), set `interactive: true` in the definition.
The renderer marks it `data-interactive`: its text can't be selected (a drag never becomes a text selection;
inputs inside stay editable) and the selection menu ignores it.

## 5. Finish

```powershell
npm run catalog     # the skill and docs/content-format.md now know the block
npm test            # the example must validate
npm run ruler       # add an instance to the sample course to cover it
```

Add an instance to `content/semesters/_sample/.../topics/representaciones.yaml` so the ruler test exercises it.

## Canvas modules (freeform graphics)

When no block fits, the content can use a `canvas` block with a TSX module in `evaluations/<eval>/canvas/<name>.tsx`.
The module default-exports a component receiving `CanvasModuleProps` (`app/src/blocks/canvas/types.ts`):
`{ vars, setVar, tokens, kit, width, height, props }`. Build with the graphics kit (`kit.Plane`, `Grid`, `Axes`,
`Vector`, `Point`, `Label`, `Segment`, `Curve`, `Shape`, `Transition`), see the sample `eigen-demo.tsx`.
If the same canvas idea shows up three times, promote it to a real block.

Canvas `height` is a preferred size, not an overflow clip: a module can grow when its controls wrap.
Measure the control/caption rows with `ResizeObserver`, then give each drawing a usable minimum height.
Check the actual **card width**, including narrow columns, rather than only the viewport breakpoint.
Keep every SVG label within the SVG bounds, wrap long annotations at measured font widths, and put
long explanations below the plot. Stagger dense axis labels rather than dropping values.
`Plane` captures drags on the SVG itself so replaced scene marks do not interrupt the gesture.

For continuous drawings use `curvePath` / `areaPath` from `@/graphics-kit`: sampling follows the
screen resolution, and explicit `breaks` preserve genuine corners/jumps. Fill under the actual path,
not a stack of sampled rectangles. Histograms and discrete CDFs retain their real steps.
Use exact SVG circles/polygons for uniform supports. For a changing joint density, `DensityField`
draws a smooth texture at twice the CSS resolution, with an exact SVG `clip` for the support.
Keep its scene component stable so dragging an unrelated marker does not regenerate the texture.
Check labels against one another, not only against the SVG boundary; captions can carry longer notes.
