# Guide: add a diagram node shape

Diagrams (`diagram` block, flowcharts and state diagrams) are drawn by `app/src/graph/`. Node outlines are a registry:
adding one is adding **one file**, nothing else changes (no `switch` anywhere).

## 1. Create `app/src/graph/shapes/<name>.shape.ts`

```ts
import { defineShape } from "./registry";

export default defineShape({
  key: "hexagon",                       // the name a GraphNode.shape / a parser uses
  size: (t) => ({ w: Math.ceil(t.w) + 56, h: Math.max(48, Math.ceil(t.h) + 26) }),   // box that fits the text block t
  halfExtent: (b, axis) => (axis === "x" ? b.w : b.h) / 2,   // distance centre → outline along `axis` (see below)
  path: ({ w, h }) => `M…Z`,            // SVG path of the outline, centred on (0, 0)
  // optional: deco(b) → extra paths (class "deco"), className → CSS class on the node, noLabel → no text
});
```

`halfExtent(box, axis, offset)`: how far the outline is from the centre along `axis` ("x" or "y"), on a line `offset` px
off-center on the other axis. Edges attach to the outline at those points, so it must follow the real shape (a circle:
`sqrt(r² − offset²)`; a diamond shrinks linearly; a rectangle is constant).

The file is picked up automatically (`import.meta.glob("./*.shape.ts")`).

## 2. Make a parser produce it (optional)

`graph/mermaid.ts` maps Mermaid delimiters to shape keys (`SHAPES`). Add the delimiter there if Mermaid has one.
Specs built by hand just set `shape: "hexagon"` on a `GraphNode`.

## 3. Style it (optional)

Colors come from tokens in `graph/graph.css` (`.gv-node .shape`, tones `.tone-accent|ok|warn`, edge styles `.edge-dashed|strong|muted`).
A new tone or edge style is just a new CSS class; the spec carries its name (`tone`, `style`).

## 4. Check

`npm test` (layout tests cover overlaps and edges crossing nodes), then look at a diagram in the app. Add the shape to a
test graph in `app/src/graph/graph.test.ts` if it has special geometry.
