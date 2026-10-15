# Content format (v1, `schema: 1`)

Course content is **YAML files**, written by the build-course skill and validated by `npm run validate`
(the app runs the same checks and shows a readable error panel instead of a broken page).
User state (progress, sessions, notes) never lives here: it's in SQLite, linked by node **ID**.

## Layout

```text
content/semesters/<semester-id>/
  semester.yaml
  courses/<course-id>/
    course.yaml
    sources.yaml            ← registry of source files (id → path, kind, title)
    sources/                ← original material, read-only (syllabus/ bibliography/ classes/ guides/ midterms/ finals/ assignments/ other/)
    processed/              ← skill working files (inventory, classification, coverage…)
    evaluations/<eval-id>/
      evaluation.yaml
      topics/<topic>.yaml   ← one top-level node per file
      canvas/<name>.tsx     ← freeform graphics (canvas block)
      assets/               ← images used by image blocks
```

Folder names must equal the `id` inside the file. Every file starts with `schema: 1`.

## `semester.yaml`

```yaml
schema: 1
id: 2026-C2
label: 2º cuatrimestre 2026
start: 2026-08-10
end: 2026-12-19
active: true                 # the one Home shows
courses: [pdp]               # order = display order
holidays:
  - { date: 2026-10-12, label: Día del Respeto a la Diversidad Cultural }
  - { date: 2026-07-20, until: 2026-07-31, label: Receso }
```

## `course.yaml`

```yaml
schema: 1
id: pdp
name: Paradigmas de Programación     # the course's real name, from the material
code: "7507"
language: es                          # content language (kind labels, UI bits on the page)
idPrefix: pdp                         # every node id starts with this (default: the course id)
staff:
  - { name: …, role: Teórica, contact: … }
locations:
  - { id: aula-203, campus: Sede Paseo Colón, room: "203" }
modality: in-person                   # in-person | virtual | hybrid
links:
  - { label: Campus, url: "https://…" }
schedule:                             # recurring weekly classes (become calendar events)
  - id: teorica
    label: Teórica
    weekday: tue                      # mon tue wed thu fri sat sun
    start: "19:00"
    end: "22:00"
    from: 2026-08-11
    until: 2026-12-01
    location: aula-203                # a locations[].id (or free text)
    modality: in-person
    link: "https://meet…"             # optional
    staff: [ … ]                      # optional
    exceptions: [2026-10-13]          # dates without class
bibliography: [libro-x]               # ids from sources.yaml
evaluations:                          # only the ones this course has
  - id: parcial-1
    kind: midterm                     # midterm | retake | final | assignment | submission
    title: Parcial 1
    date: 2026-10-20
    start: "19:00"
    end: "22:00"
    location: aula-203
    scope: "Unidades 1 a 4"
    passing: "Nota ≥ 4 (aprobado), ≥ 7 (promoción)"
  - { id: recuperatorio-1, kind: retake, title: Recuperatorio, date: 2026-11-24, retakes: parcial-1 }
promotion: "Free text: the promotion / passing regime as the staff states it."
notes: "Optional free text."
```

An evaluation gets a study page only when `evaluations/<id>/evaluation.yaml` exists; otherwise it still appears in
the calendar, the course page and the priority card.

## `sources.yaml`

```yaml
schema: 1
sources:
  - { id: programa, path: sources/syllabus/programa-2026.pdf, kind: syllabus, title: Programa 2026, short: Programa }
  - { id: teorica-03, path: sources/classes/teorica-03.pdf, kind: class, title: "Teórica 3: Objetos", short: Teórica 3 }
```

`kind ∈ syllabus | bibliography | class | guide | midterm | final | assignment | solution | schedule | other`.
`short` is what the notebook prints next to a node ("Teórica 3 · p. 12").

## `evaluation.yaml`

```yaml
schema: 1
id: parcial-1
title: Parcial 1
paper: ruled          # ruled | grid (default for the page; the user can switch, it persists)
topics:               # files in topics/, in pedagogical order
  - objetos.yaml
  - polimorfismo.yaml
```

## Topic files: nodes and blocks

A topic file is one **node** (usually `kind: section`). A node has **one ordered `body`**; each item is either a
child node `{ node: {...} }` or a **single-key block** `{ <blockType>: <props> }`.

```yaml
schema: 1
id: alg/p1/autoval            # <course prefix>/<evaluation>/<topic>[/<slug>…]
kind: section
title: Autovalores y autovectores
container: true               # optional; sections are containers by default (no own checkbox state)
weight: 2                     # optional relevance multiplier (× the size derived from content)
number: "3.1"                 # optional heading number override
vars: { theta: 20 }           # shared page variables declared by this subtree (name: initial value)
body:
  - node:
      id: alg/p1/autoval/def
      kind: definition
      title: Autovalor y autovector
      note: "¡ojo! v ≠ 0 siempre"           # optional pencil note beside/below the heading
      sources: [{ ref: apunte-u3, page: 12, basis: explicit }]
      relations: [{ type: prerequisite, target: alg/p1/matrices/det }]
      body:
        - text: |
            Sea $A \in \mathbb{K}^{n\times n}$. Un escalar $\lambda$ es ==autovalor== de $A$ si…
        - math: 'A v = \lambda v'
        - columns:
            - [ { graph2d: { vectors: [ { to: ["cos(theta*PI/180)", "sin(theta*PI/180)"] } ] } } ]
            - [ { slider: { var: theta, min: 0, max: 359 } }, { text: "θ = {{theta}}°" } ]
```

### Node fields

| field | type | notes |
|---|---|---|
| `id` | string | **Required.** Kebab-case path segments, unique across *all* content, stable forever (progress is keyed by it). Reuse existing IDs when updating. |
| `kind` | string | **Required.** A registered kind (catalog below). Unknown kinds are errors (with a "did you mean"). |
| `title` | string | Shown in the label line / heading, overviews, LLM context. |
| `container` | bool | No own checkbox state; complete when all children are. Default from the kind. |
| `weight` | number > 0 | Relevance multiplier for progress % and treemap area (default 1). |
| `number` | string | Overrides the automatic section number. |
| `note` | string | Short red handwritten note beside the heading when space permits, otherwise in its own row below it. Reserves space, has no arrow, and stays visible on small screens. |
| `vars` | map | Page variables (number / bool / string) with their initial values. |
| `sources` | list | `{ ref, page?, locator?, basis }`. `basis ∈ explicit \| inferred \| generated`; `ref` must exist in `sources.yaml` (may be omitted only for `generated`). |
| `relations` | list | `{ type, target }`, `type ∈ prerequisite \| related \| uses \| generalizes \| example-of \| tested-in`. Targets that don't exist are warned as orphans. |
| `body` | list | Blocks and child nodes, in order. |
| kind fields | | e.g. exercises require `origin: { ref, locator }`. |

### Rules the validator enforces

- **IDs**: format, global uniqueness (error); prefix = course `idPrefix` (warning).
- **Sources**: every `ref` exists in `sources.yaml`.
- **Kinds and blocks** exist; block props match their schema; nested blocks too. Nodes can't be nested inside blocks.
- **Exercises** (`kind: exercise`) carry `origin` (they come from the sources, never invented) and an `exercise` block whose `solution.basis` says `official` or `generated`.
- **Page variables**: every variable a block reads or writes (including `{{var}}` in text) is declared in some node's `vars`.
- **Tall-math rule** (warning): inline math (`$…$`) must not contain tall constructs (matrices, `\frac`, `\sum`/`\int` with limits, `\binom`, big delimiters). Put them in a display formula (`math` block or a `$$…$$` paragraph). A table cell that is *only* a formula may be tall: that row hangs.
- **Relations** to missing nodes are reported as orphans (warning).

### Writing tips (YAML)

- Prefer block scalars (`|`) or single quotes for anything with backslashes: `math: '\frac{a}{b}'`. In double quotes every backslash must be doubled.
- Markdown in `text`: `**bold**`, `*italic*`, `` `code` ``, `==highlight==`, lists, links, `$inline$`, `$$display$$`, `{{var}}`.
- Text stays in the course's language, with the staff's own notation and terminology.

## Catalog (generated)

Everything below is generated by `npm run catalog` from the registries; do not edit by hand.

<!-- catalog:start -->
<!-- GENERATED by `npm run catalog` from the block and kind registries. Do not edit by hand. -->

### Blocks

A body item is `{ node: … }` or exactly one block `{ <type>: <props> }`. Blocks nest only inside layout blocks.

| block | group | ruler | reads/writes vars |
|---|---|---|---|
| [`code`](#block-code) | content | snapped |  |
| [`image`](#block-image) | content | snapped, card |  |
| [`math`](#block-math) | content | line holder | reads |
| [`table`](#block-table) | content | snapped |  |
| [`text`](#block-text) | content | line holder | reads |
| [`input`](#block-input) | control | snapped | writes |
| [`slider`](#block-slider) | control | snapped | writes |
| [`toggle`](#block-toggle) | control | snapped | writes |
| [`canvas`](#block-canvas) | freeform | snapped, card | reads / writes |
| [`callout`](#block-callout) | layout | line holder |  |
| [`collapsible`](#block-collapsible) | layout | line holder |  |
| [`columns`](#block-columns) | layout | line holder |  |
| [`stack`](#block-stack) | layout | line holder |  |
| [`tabs`](#block-tabs) | layout | line holder |  |
| [`exercise`](#block-exercise) | practice | line holder |  |
| [`diagram`](#block-diagram) | visual | snapped |  |
| [`graph2d`](#block-graph2d) | visual | snapped, card | reads / writes |
| [`graph3d`](#block-graph3d) | visual | snapped, card | reads |

### Content

<a id="block-code"></a>
#### `code` (v1)

Source code on its own card (language label, line numbers, copy button), highlighted with Shiki in the notebook's own ink colors.
`lang` is any Shiki language id (python, java, c, js, ts, sql, haskell, bash…). Long lines scroll sideways.
Use the staff's own code style and identifiers.

| field | type | required | default |
|---|---|---|---|
| `lang` | `string` |  | `"text"` |
| `code` | `string` | yes |  |

Example:

```yaml
- code:
    lang: python
    code: |
      import numpy as np
      vals, vecs = np.linalg.eig(A)
```

<a id="block-image"></a>
#### `image` (v1)

An image taped onto the page as a card. `src` is relative to the evaluation folder (e.g. `assets/diagrama.png`)
or an http(s) URL. Always write a meaningful `alt`. Optional `caption` (inline Markdown) and `lines` (max height in ruled lines).

| field | type | required | default |
|---|---|---|---|
| `src` | `string` | yes |  |
| `alt` | `string` |  | `""` |
| `caption` | `string` |  |  |
| `lines` | `integer` |  |  |

Example:

```yaml
- image: { src: assets/ciclo.png, alt: "Ciclo de vida de un objeto", caption: "Fuente: Teórica 3" }
```

<a id="block-math"></a>
#### `math` (v1)

A display formula (KaTeX), centered and aligned so its baseline sits on a rule. Use it for anything
tall: matrices, fractions, sums with limits, aligned equations (\begin{aligned}…\end{aligned}). Accepts `{{var}}`.
Shorthand: `- math: "A v = \\lambda v"` or with a block scalar.

| field | type | required | default |
|---|---|---|---|
| `tex` | `string` | yes |  |

A shorthand (non-object) form is also accepted.

Example:

```yaml
- math: |
    A = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}
```

<a id="block-table"></a>
#### `table` (v1)

A table on its own card above the ruled paper (header strip, hairline rows). Cells are inline Markdown + math.
Cells never wrap (the table scrolls sideways instead), so keep them short. A cell may hold a tall formula
(e.g. a matrix): the row simply grows to fit. Optional `columns` (header row) and `caption`.

| field | type | required | default |
|---|---|---|---|
| `columns` | `string \| number[]` |  |  |
| `rows` | `string \| number[][]` | yes |  |
| `caption` | `string` |  |  |

Example:

```yaml
- table:
    columns: [Matriz, "$\\chi_A(\\lambda)$", Autovalores]
    rows:
      - ["$A$", "$(\\lambda-3)(\\lambda-1)$", "$3,\\ 1$"]
```

<a id="block-text"></a>
#### `text` (v1)

Rich text: Markdown (**bold**, *italic*, `code`, lists, [links](url)), ==highlight== for key terms,
inline math `$…$` and display math `$$…$$` (KaTeX), and `{{var}}` to show a page variable's live value.
Paragraphs are separated by a blank line. **Tall-math rule:** inline math must stay one line tall; matrices,
\frac, sums/integrals with limits go in display math (`$$…$$` on its own paragraph, or a `math` block).
In YAML prefer a block scalar (`|`) so backslashes don't need escaping.

Props: `string`

Example:

```yaml
- text: |
    Un escalar $\lambda$ es un ==autovalor== de $A$ si existe $v \neq 0$ tal que
    $$A v = \lambda v$$
```

### Control

<a id="block-input"></a>
#### `input` (v1)

A small number/text field that writes a page variable (e.g. a matrix entry, a sample size).

| field | type | required | default |
|---|---|---|---|
| `var` | `string` | yes |  |
| `label` | `string` | yes |  |
| `type` | `"number" \| "text"` |  | `"number"` |
| `min` | `number` |  |  |
| `max` | `number` |  |  |
| `step` | `number` |  |  |

Example:

```yaml
- input: { var: n, label: "n", type: number, min: 1, max: 50 }
```

<a id="block-slider"></a>
#### `slider` (v1)

A slider that writes a numeric page variable. Declare the variable (with its initial value) in a node's `vars`.
Every block that reads it (graphs, text with {{var}}, canvases) updates live.

| field | type | required | default |
|---|---|---|---|
| `var` | `string` | yes |  |
| `min` | `number` | yes |  |
| `max` | `number` | yes |  |
| `step` | `number` |  | `1` |
| `label` | `string` |  |  |
| `unit` | `string` |  | `""` |

Example:

```yaml
- slider: { var: theta, min: 0, max: 359, label: "θ", unit: "°" }
```

<a id="block-toggle"></a>
#### `toggle` (v1)

A switch that writes a boolean page variable (e.g. showForces). Graphs and canvases can show/hide things with it.

| field | type | required | default |
|---|---|---|---|
| `var` | `string` | yes |  |
| `label` | `string` | yes |  |

Example:

```yaml
- toggle: { var: showEigen, label: "Mostrar autoespacios" }
```

### Freeform

<a id="block-canvas"></a>
#### `canvas` (v1)

Freeform interactive graphic: a TSX module written for this page, in `evaluations/<eval>/canvas/<module>.tsx`.
Use it when no prebuilt block can express the idea. The module default-exports a React component that receives
`{ vars, setVar, tokens, kit, width, height, props }`: page variables, a setter, live design tokens, the
graphics kit (Plane, Grid, Axes, Vector, Point, Label, Segment, Curve, Shape, Transition, DensityField, MathText, SvgMathLabel), the card's inner size
and the static `props` from YAML. `height` is a preferred drawing budget: the host can grow if wrapped controls
or labels need extra space. Measure controls instead of subtracting a fixed header height. Declare every variable it touches in `reads`/`writes`, and add a one-line
`describe` for the LLM. `kit.Label` renders string children with `$TeX$` as measured math. Use
`kit.MathText` for HTML controls/readouts and `kit.SvgMathLabel` for custom SVG coordinates; never draw
TeX through raw SVG `<text>` or canvas `fillText`. Keep formulas whole when wrapping and measure their
rendered dimensions, including height, to avoid clipping. Errors are caught and shown in place.

| field | type | required | default |
|---|---|---|---|
| `module` | `string` | yes |  |
| `height` | `integer` |  | `9` |
| `props` | `map` |  | `{}` |
| `reads` | `string[]` |  | `[]` |
| `writes` | `string[]` |  | `[]` |
| `describe` | `string` |  |  |

Example:

```yaml
- canvas:
    module: eigen-demo
    height: 9
    reads: [theta]
    writes: [theta]
    describe: "v rotates with θ; shows Av and the eigen-directions of A"
```

### Layout

<a id="block-callout"></a>
#### `callout` (v1)

A side note with a colored margin bar: `note` (neutral), `warning` (common mistake), `tip`,
`exam` (how this is usually asked in exams; cite the exam in the node's sources).

| field | type | required | default |
|---|---|---|---|
| `variant` | `"note" \| "warning" \| "tip" \| "exam"` |  | `"note"` |
| `title` | `string` |  |  |
| `body` | `any[]` | yes |  |

Example:

```yaml
- callout:
    variant: warning
    title: Error común
    body:
      - text: "$v \\neq 0$ siempre: el vector nulo nunca es autovector."
```

<a id="block-collapsible"></a>
#### `collapsible` (v1)

Hidden content behind a handwritten toggle (proofs, derivations, long examples). Closed by default.
For exercise solutions use the `exercise` block instead (it adds the "solved" button and the solution's basis).

| field | type | required | default |
|---|---|---|---|
| `label` | `string` | yes |  |
| `open` | `boolean` |  | `false` |
| `body` | `any[]` | yes |  |

Example:

```yaml
- collapsible:
    label: Demostración
    body:
      - text: "Inducción en $k$…"
```

<a id="block-columns"></a>
#### `columns` (v1)

Side-by-side columns (2–4), each a list of blocks. Typical: a graph card next to its explanation and controls.
Columns stack vertically on phones. "Text with an image" is `columns` with `text` + `image`, not its own block.

Props: `any[][]`

Example:

```yaml
- columns:
    - [ { graph2d: { plots: [ { fn: "x => k * x" } ] } } ]
    - [ { slider: { var: k, min: -3, max: 3, step: 0.1 } }, { text: "Pendiente $k = {{k}}$" } ]
```

<a id="block-stack"></a>
#### `stack` (v1)

Groups blocks vertically (useful as one column's content or a tab's body when you need a single item).

Props: `any[]`

Example:

```yaml
- stack:
    - text: "Primero esto"
    - math: "x^2"
```

<a id="block-tabs"></a>
#### `tabs` (v1)

Alternative explanations of the same thing (e.g. Algebraica / Geométrica / En código). Only one is visible at a time.

| field | type | required | default |
|---|---|---|---|
| `tabs` | `object[]` | yes |  |

Example:

```yaml
- tabs:
    tabs:
      - { label: Algebraica, body: [ { text: "…" } ] }
      - { label: Geométrica, body: [ { text: "…" } ] }
```

### Practice

<a id="block-exercise"></a>
#### `exercise` (v1)

Practice: an optional statement, then a hidden worked solution behind "Ver resolución", ending with a
"Lo resolví bien" button that marks the exercise node as learned. Lives inside a node of kind `exercise`
(which carries `origin: { ref, locator }`, because exercises always come from the sources).
`solution.basis`: `official` if a source has the solution (give `ref`/`locator`), `generated` otherwise.
Solutions follow the staff's notation, steps and level of detail.

| field | type | required | default |
|---|---|---|---|
| `statement` | `any[]` |  | `[]` |
| `solution` | `object` | yes |  |

Example:

```yaml
- exercise:
    statement:
      - text: "Hallar los autovalores de"
      - math: "A = \\begin{pmatrix} 4 & 1 \\\\ 2 & 3 \\end{pmatrix}"
    solution:
      basis: generated
      body:
        - math: "\\chi_A(\\lambda) = (\\lambda-5)(\\lambda-2)"
```

### Visual

<a id="block-diagram"></a>
#### `diagram` (v1)

A diagram written in Mermaid. Flowcharts (`flowchart LR|TD`) and state diagrams (`stateDiagram-v2`) are drawn by
Corta's own engine: layered layout, curved edges that never cross a node, edge-label chips, hover to light every path
through a node. On narrow screens horizontal diagrams may reflow vertically, with compact spacing and full phone
width; node labels and connections stay unchanged. Larger diagrams retain horizontal scrolling. Supported: nodes
`A[text]` `A(text)` `A((text))` `A([text])` `A{text}`, links `-->` `---` `-.->` `==>`,
link text `-->|text|` or `-- text -->`, `<br/>` line breaks, quoted labels, chains; states with `[*]` start/end and
`: label` transitions. Anything else in a flowchart (subgraph, style, classDef, `&`) or any other kind (class, sequence,
ER, mindmap…) is drawn by Mermaid itself, in the same card. Self-loops also use the complete Mermaid fallback.
Write mathematical node/edge labels with `$TeX$` (`$$TeX$$` is accepted too), e.g. `A["$F_X^{-1}(u)$"]`
and `-->|"$P(A\mid B)$"|`. Prose stays literal; programming names/identifiers are not guessed to be math.
KaTeX formulas are measured in both width and height, including fractions and limits; taller labels grow their
boxes. Use `<br/>` between complete formulas/prose lines. The fallback normalizes math to Mermaid's native
double-dollar syntax and uses the same KaTeX fonts. Keep labels short; quote labels with special characters.

| field | type | required | default |
|---|---|---|---|
| `code` | `string` | yes |  |
| `caption` | `string` |  |  |

A shorthand (non-object) form is also accepted.

Example:

```yaml
- diagram:
    code: |
      flowchart LR
        A[Clase] -->|instancia| B(Objeto)
        B --> C{¿Mensaje?}
```

<a id="block-graph2d"></a>
#### `graph2d` (v1)

An interactive 2D plot (Mafs) on a taped card. Numbers can be expressions using Math functions and page
variables (e.g. `"k * sin(x)"`, `["cos(theta)", "sin(theta)"]`); the graph redraws when variables change.
`plots` are y = f(x) with `fn` an expression in x; `parametric` takes x(t), y(t); `vectors`, `segments`, `points`.
A point with `drag: { x: a, y: b }` is draggable and writes those variables. Colors are token names
(pen, red, learned-ink, ink-soft, ev-…). `height` in ruled lines. Point/vector labels accept `$TeX$`
for mathematical notation; coordinate/function expressions remain executable expressions without delimiters.

| field | type | required | default |
|---|---|---|---|
| `height` | `integer` |  | `9` |
| `view` | `object` |  | `{"x":[-5,5],"y":[-4,4]}` |
| `grid` | `boolean` |  | `true` |
| `plots` | `object[]` |  | `[]` |
| `parametric` | `object[]` |  | `[]` |
| `vectors` | `object[]` |  | `[]` |
| `segments` | `object[]` |  | `[]` |
| `points` | `object[]` |  | `[]` |
| `caption` | `string` |  |  |

Example:

```yaml
- graph2d:
    view: { x: [-3, 3], y: [-2, 2] }
    plots: [ { fn: "k * sin(x)" } ]
    points: [ { at: [a, "k * sin(a)"], drag: { x: a }, label: "P" } ]
```

<a id="block-graph3d"></a>
#### `graph3d` (v1)

A 3D scene (react-three-fiber) with orbit controls: drag to rotate, scroll/pinch to zoom.
`surfaces` are z = f(x, y) over a range; `vectors` and `points` take [x, y, z] (numbers or expressions with
page variables). Math convention: z is up. Colors are token names. `height` in ruled lines.
Point/vector labels accept `$TeX$` and render as camera-facing math text.

| field | type | required | default |
|---|---|---|---|
| `height` | `integer` |  | `12` |
| `axes` | `boolean` |  | `true` |
| `camera` | `[number, number, number]` |  | `[5,3.6,5]` |
| `surfaces` | `object[]` |  | `[]` |
| `vectors` | `object[]` |  | `[]` |
| `points` | `object[]` |  | `[]` |
| `caption` | `string` |  |  |

Example:

```yaml
- graph3d:
    surfaces: [ { z: "a * (x*x - y*y)", color: pen } ]
    vectors: [ { to: [1, 1, 0], color: red, label: v } ]
```

### Node kinds

`kind` on a node. Containers have no checkbox state of their own (fully derived from children).

| kind | label (es / en) | heading | container by default | extra fields |
|---|---|---|---|---|
| `concept` | Concepto / Concept | label |  |  |
| `definition` | Definición / Definition | label |  |  |
| `property` | Propiedad / Property | label |  |  |
| `remark` | Observación / Remark | label |  |  |
| `theorem` | Teorema / Theorem | label |  |  |
| `lemma` | Lema / Lemma | label |  |  |
| `corollary` | Corolario / Corollary | label |  |  |
| `formula` | Fórmula / Formula | label |  |  |
| `method` | Método / Method | label |  |  |
| `procedure` | Procedimiento / Procedure | label |  |  |
| `example` | Ejemplo / Example | label |  |  |
| `proof` | Demostración / Proof | none |  |  |
| `exercise` | Ejercicio / Exercise | label |  | `origin` |
| `section` | Sección / Section | section | yes |  |

- **`concept`**: An idea that groups definitions, properties and examples.
- **`definition`**: A formal definition, in the staff's own wording and notation.
- **`property`**: A property or characterization.
- **`remark`**: A remark, warning or common mistake.
- **`theorem`**: A theorem. Put its proof in a child `proof` node.
- **`lemma`**: A lemma (auxiliary result).
- **`corollary`**: A corollary of a previous result.
- **`formula`**: A formula worth memorizing.
- **`method`**: A method or procedure to solve a class of problems.
- **`procedure`**: A step-by-step procedure.
- **`example`**: A worked example (not a practice exercise).
- **`proof`**: A proof, usually a child of a theorem. No label line: its body is normally one `collapsible` labeled with the proof name.
- **`exercise`**: A practice exercise taken from the sources (never invented). Requires `origin: { ref, locator }` and an `exercise` block whose solution says if it's official or generated.
- **`section`**: A topic or sub-topic. Drawn as a numbered heading. A container by default: its checkbox is fully derived from its children.

<!-- catalog:end -->
