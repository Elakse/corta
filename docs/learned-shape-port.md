# Learned-node shape: port spec

Replaces the old learned look (rounded green wash + margin bracket). A learned node (outermost learned only, same rule as today) is drawn as ONE closed outline: a tab that wraps its checkbox, continuing as a full-bleed band over the node. A green ink line runs the full loop around it, and the frame's side borders light up underneath. Still highlighted, never faded; rules and text stay on top.

Reference implementation (vanilla JS prototype): `prototypes/notebook-page/learned-shape-reference.js`. Geometry lives in `app/src/core/learned-shape/geometry.ts`.

## Geometry (all derived, nothing hardcoded)

- `p = (u - cb) / 2` is the gap between checkbox and tab edge. Tab height = `u` (one line), centered on the checkbox.
- `r = checkboxRadius + p`. EVERY radius is `r`: tab corners, band corners, concave joins. Concentric on purpose, so it follows if the checkbox size changes.
- Band spans from the centre of the frame's left border to the centre of its right border (the ink covers the border). Bottom = node bottom + `u/2` (min: tab bottom + `2r + 4`). Top is flush with the tab top.
- Headroom: if the first line is tall (section headings, line-height >= 1.5u) and there is room (>= 2r), the band starts half a line above the text and the tab becomes an "ear" with two concave joins, so the loop never cuts through the heading.
- Checkbox columns: deeper = closer to the frame: `x = fx - 6 - p - cb/2 - (2 - min(depth,2)) * step` (step 14 desktop, 9 phone). Replaces the fixed [62, 84, 106] / [33, 49, 65].
- One closed counter-clockwise path (tab, left edge, bottom, right edge, top) used for BOTH fill and ink.

## Layers

- Fill = full-sheet SVG under the ruled frame (rules + text draw over it).
- Ink + frame-border patch = SVG at the start of the margin layer, above the frame, under the checkboxes. The patch (paper rect + wash rect) hides the frame border where the tab crosses it.
- Recomputed on every relayout (the ruler's ResizeObserver already fires per frame while collapsibles animate).

## Animation (Web Animations API, no library, easing `cubic-bezier(.2,.8,.2,1)`)

- Check: checkbox pops (scale 1 -> 1.22 -> 1, 380ms); ink draws the loop on starting at the tab (`pathLength=1`, dasharray `"1 2"`, offset 1 -> 0, 900ms, 60ms delay); fill wipes out from the tab (`clip-path: inset(0 100% 0 0)` -> `inset(0)`, 720ms, 140ms delay); patch fades in.
- Uncheck: reverse in 300ms, then remove the elements.
- NO animation on page load, only on user toggles. Respect `prefers-reduced-motion` (no animation, state still shown).
- Checking a parent: its shape enters while its learned children's shapes leave.

## CSS (tokens already exist)

```css
.shape-layer { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none }
.learned-fill, .learned-patch-wash { fill: var(--learned) }
.learned-patch { fill: var(--paper) }
.learned-ink { fill:none; stroke: var(--learned-ink); stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:1 2 }
```

Remove the old wash (`.node::before` rules) and the `.bracket` element/CSS/JS. Add the fill SVG right before the header in the sheet so it paints under the frame.

## Architecture

Pure geometry in `app/src/core/learned-shape/geometry.ts` (`shapePaths(pos, u, checkboxRadius) -> { d, patch }`), unit-tested (tab height = u, all radii equal, path closed, ear vs flush, min bottom). A layer component/hook owns the SVGs, the shapes map and the animations. Progress logic is unchanged, except `render()` now takes an `animate` flag set only on user toggles.

## Docs and tests

- Update architecture.md section 6 (Margin checklist: replace "highlighter wash plus a bar") and study_platform_design.md section 6 ("Learned content is highlighted").
- Add a decisions-log.md entry (closed tab+band outline, concentric radii, headroom ear, ink loop, checkbox columns closer to the frame, no animation on load).
- The ruler e2e must pass untouched (shapes don't touch text flow). Small e2e: check a node and the shape exists; uncheck and it's gone; reload and it's back with no animation running.
- Full phase gate (typecheck, unit, e2e, ruler). Commit ONLY the learned-shape files, local commit, no push.
