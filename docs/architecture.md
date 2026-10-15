# Corta — Architecture & Roadmap

> **Status: approved (2026-10-07).** Companion to `study_platform_design.md` (the *what*). This doc is the *how*.

---

## 1. The core idea in one picture

```text
  Course content (files, written by the skill)          User state (database)
  ───────────────────────────────────────────          ─────────────────────
  Semester → Course → Evaluation → Node tree    ←ID→   progress, plans, notes,
                                    │                   selections, gcal event IDs
                                    └─ Blocks (visual components)
                                          │
                              Block Registry (one entry per block type)
                                          │
                     Renderer · Progress engine · LLM context builder
```

Three rules hold everything together:

1. **Content is files, state is a database, IDs connect them.** Rebuild content as much as you want; progress survives.
2. **Every block type lives in one registry.** Adding a new component = adding one folder. Nothing else changes.
3. **Everything is derived from one source.** Progress %, the overview treemap, the calendar and the LLM context are all computed from the same tree. Nothing is stored twice.

### Tutor connections

The tutor talks through `LlmProvider`, independent of the model vendor. Small registered provider profiles
use reusable protocol adapters (`server/src/llm/adapters/`) for Chat Completions or Anthropic Messages.
Profiles own credential references, endpoints, default models and model suggestions; only non-secret
metadata reaches Settings and chat. The UI discovers profiles and saves provider/model preferences in SQLite
(`llm.configuration`, last model per provider). Each chat turn pins the explicit choice through every tool
round. No automatic provider fallback occurs. OpenCode Go uses a fixed subscription endpoint; its account
overflow setting must be disabled separately. See `guides/llm-setup.md` for activation and extension.

### Mathematical labels

`core/markup/labels.ts` handles explicit TeX in authored labels; shared `MathText` / `SvgMathLabel`
components render it through KaTeX with literal prose escaped. The graph engine injects measured
label widths/heights into its pure layout. Headings, overview labels, controls, 2D/3D labels and canvas
graphics use the same notation. Block registries expose visual `labels` for syntax validation, separate
from ruled `markup` and its tall-inline rule. See `guides/math-labels.md`.

---

## 2. Content model: Nodes + Blocks

Two layers, deliberately thin:

| Layer | What it is | Why it exists |
|---|---|---|
| **Node** | A semantic wrapper: `id`, `kind`, `title`, `sources`, `weight`, and one ordered `body` | Gives meaning: trackable progress, overview, coverage audit, LLM context, stable IDs |
| **Block** | A visual component: text, image, graph, diagram… | Gives presentation. Freely mixed and nested. |

A **theorem is not a special component**. It's a node with `kind: theorem` whose content is ordinary blocks.
A node has **one ordered `body`**: each item is either a block (`{ <type>: props }`) or a child node (`{ node: … }`),
so order is explicit (statement, then its proof as a child node, then more text). Full reference: `content-format.md`.

```yaml
- node:
    id: alg/p1/autoval/thm-li
    kind: theorem
    title: Independencia de autovectores
    sources: [{ ref: apunte-u3, page: 15, basis: explicit }]
    body:
      - text: "Si $v_1, \\dots, v_k$ son autovectores asociados a autovalores distintos…"
      - node:
          id: alg/p1/autoval/thm-li/dem
          kind: proof
          body:
            - collapsible: { label: Demostración, body: [ { text: "Inducción en $k$…" } ] }
```

- `kind` is just an **open label** (theorem, definition, method, exercise…) from a small registry (`app/src/kinds/`): label per language, heading style, container default, optional extra fields (e.g. exercise `origin`). New kinds = one entry.
- `basis` on sources = `explicit | inferred | generated` (the traceability tiers).
- `weight` (optional) feeds weighted progress and treemap sizes. Implemented as a **relevance multiplier** on the size derived from content (decisions-log 2026-10-07).

### Block catalog (v1)

Composition over special types. "Text with images" is a `columns` block containing `text` + `image`, not its own type.

| Group | Blocks |
|---|---|
| **Content** | `text` (Markdown + LaTeX + code + symbols), `image`, `table` |
| **Layout** | `stack`, `columns`, `callout` (note / warning / tip), `collapsible` (hidden solutions, proofs), `tabs` (alternative explanations) |
| **Prebuilt visuals** | `graph2d`, `graph3d`, `diagram` (flow/tree/graph), plus more prebuilt ones over time |
| **Freeform** | `canvas`: agent-written interactive graphic (see §3) |
| **Practice** | `exercise`: statement + hidden worked solution + "solved" check (marks the node learned) |
| **Control** | `slider`, `toggle`, `input`: write to shared page variables |

---

## 3. Freeform graphics: legos *and* style

Your two options aren't exclusive. Proposed hybrid:

- **Design tokens** (colors, fonts, stroke widths, radii, motion timings) live in one file used by both CSS and graphics. Consistency comes from here, automatically.
- A small **graphics kit**: themed primitives the agent can use (axes, point, vector, label, arrow, shape, animated transition). Using them is easy and on-style by default.
- The **`canvas` block** gives the agent full code freedom (a small TSX module per graphic), with the kit and tokens available. It can use the legos, draw raw, or mix.

Result: as much freedom as needed, and it still looks like it belongs.

Canvas hosts treat the requested height as a minimum and allow modules to grow for measured control
rows and captions. Drawing height follows the remaining space, with a readable minimum at narrow card
widths. Pointer capture belongs to the stable `Plane` SVG, so redrawing marks does not interrupt a drag.

`graphics-kit/paths.ts` samples curves at screen resolution and splits them at declared breakpoints;
area fills follow the same curve. `DensityField` renders continuous joint densities with a smooth,
theme-colored texture and exact SVG support clipping. Uniform regions use vector geometry directly.
Diagram layout measures the available card width and reflows horizontal graphs vertically when that
fits readable labels. Phone diagrams can use the viewport width beyond the notebook's narrow writing
column, preserving readable branches. Compact spacing keeps node dimensions unchanged; larger graphs
retain scrolling where neither orientation fits. Open solution containers allow this wider content;
closed solutions remain clipped and inert. The breakout is measured on mount/window resize;
the graph observes width changes only, avoiding needless reflow during notebook height alignment.

### Interaction between blocks: shared variables

The simplest version of "components talk to each other": **named page variables**, like spreadsheet cells.

```yaml
vars: { lambda: 1, showForces: false }
blocks:
  - slider: { var: lambda, min: 0, max: 5 }
  - graph2d: { fn: "x => Math.exp(-lambda * x)" }   # re-renders when lambda changes
  - text: "Con $\\lambda = {{lambda}}$ la curva decae…"
```

Every block declares which variables it **reads** and **writes** in its registry entry. That's the input/output contract, and it's what the LLM sees too. A full event/binding language can come later if real cases demand it.

---

## 4. Block Registry contract

Each block type is one folder exporting one definition:

```ts
defineBlock({
  type: "graph2d",
  version: 1,
  schema: Graph2DSchema,          // Zod: validates the YAML the agent writes
  component: Graph2D,             // React component
  reads: (props) => [...vars],    // shared variables it consumes
  writes: (props) => [...vars],   // shared variables it changes
  describe: (props, state) => "", // plain-text summary for the LLM context
  docs: "…",                      // usage guide the generation skill reads
})
```

The registry auto-generates **the skill's component catalog** from `docs` + `schema`. Add a block and the agent can use it immediately. Same for the LLM panel's understanding of the page.

---

## 5. Tech stack

| Concern | Proposal | Why |
|---|---|---|
| App | **Vite + React + TypeScript** | Fast, simple, Claude writes it fluently; `import.meta.glob` loads content and canvas modules with hot reload |
| Styling / motion | **Tailwind + Framer Motion** | Design tokens + the polished animations you want |
| Content format | **YAML files**, one per topic, validated with **Zod** | LLM-friendly (multiline Markdown/LaTeX without escaping hell), diffable in git |
| Math / code | **KaTeX**, **Shiki** | Fast LaTeX, nice code highlighting |
| 2D graphs | **Mafs** | Interactive math in React, built for this |
| 3D | **react-three-fiber** | Standard React 3D |
| Diagrams | Own engine (`app/src/graph/`) for flowcharts and state diagrams; **Mermaid** for the rest (class, sequence…) | Notebook look, edges that never cross nodes; Mermaid stays as the fallback |
| Overview views | **d3-hierarchy** (treemap/tree) + React Flow (dependency graph) | Same data, three views |
| UI state | **Zustand** (page variables, selection, view state) | Tiny, simple |
| Backend | **Hono** (small Node server) + **SQLite via Drizzle** | User state, Google OAuth + Calendar push, LLM proxy |
| Runs | Locally, one `start` script | Personal app; hosting optional later |

---

## 6. Notebook page: paper, ruler and margin checklist

Evaluation pages (midterm, final, assignment) are drawn as **one endless spiral-notebook sheet**: spiral on the left, a printed header box (course · evaluation · topic · date · progress), and a rounded ruled frame. Everything is code (CSS + SVG), no images, so it scales to any length.

**Working prototype:** `../prototypes/notebook-page/notebook.html` (also published as the *Corta Notebook Page* artifact). Treat it as the visual and behavioral reference for this section.

### Paper

- Two paper types per course/evaluation: **ruled** (rayada) and **grid** (cuadriculada). Same unit `--u` (one line = one grid cell). Change the open notebook's paper in Settings; the choice persists per evaluation.
- Lines, grid and spiral are repeating patterns: the sheet has **no fixed height** and grows with content (infinite scroll; long pages render sections lazily later).
- Graphs and images are "taped" cards that sit over the paper; their height is rounded up to whole lines.
- Light and dark themes (dark paper, soft light rules). All colors are theme tokens.

### The ruler (core module)

Every piece of text must sit **on** a rule. Instead of guessing font metrics, the ruler measures real baselines and moves content onto the rules. It re-runs whenever the flow changes size (fonts loading, math rendering, a proof opening, resize).

| Line holder | How it's aligned |
|---|---|
| Text blocks (paragraphs, headings, labels, code) | Measure the first line's baseline, nudge with `top` (no layout change). Line height is always a multiple of `--u`, so later lines follow. |
| Display formulas | Find the formula's real baseline (a matrix's middle line), pad the block down until it lands on a rule, round the block to whole lines. |
| Table rows | Cells share a baseline; pad the row so it lands on a rule. Tall cells (matrices) may hang below their rule; the next row moves down to make room. |
| Everything else (cards, canvases) | Height rounded up to whole lines ("snap"). |

**Rules every block must respect:**

- Inline math may never stretch a line. Tall math (matrices, big fractions, sums with limits) goes in a **display** block.
- Table cells don't wrap (the table scrolls horizontally instead).
- A new block either contains text the ruler can measure, or is snapped.
- **Ruler test (required):** `../prototypes/notebook-page/baseline-check.py` finds every visible line of text on the page and checks its distance to the nearest rule, at several widths and both themes. It becomes an automated test in the real project; a block that breaks it doesn't ship.

### Pencil notes

- A node's optional `note` shares a wrapping flex row with its heading. The heading keeps its intrinsic
  preferred width; if heading, note and gap cannot fit, the note moves to its own row before the body.
- Notes participate in normal flow, use ruled line-height and measured ruler baselines, and have no
  arrow or rotation. Their occupied height separates them from the body instead of overlaying it.
- Body blocks retain the full writing width, including tables, display formulas and columns. Notes
  remain visible on phones; long prose wraps. Note font size and preferred width are theme metrics.

### Margin checklist

- The left margin holds one checkbox per node, **indented by nesting depth** (section → definition/theorem → proof).
- Every piece of content belongs to some checkable node, so the page works as a complete checklist.
- **Checking a node checks everything inside it. Checking a child checks only that child and its own descendants.** A parent with some (not all) children done shows a "partial" dash.
- Only each node's own flag is stored; complete / partial / progress % are derived (see §8 *Derived state*). Section-like nodes with no content of their own (`data-container`) are fully derived.
- **Learned ≠ faded.** A learned node gets a soft highlighter wash plus a bar in the margin running from its checkbox down the node. Only the outermost learned node shows the wash (no stacking). Content stays fully readable for review.
- Exercises can also be marked from inside the solution ("Lo resolví bien").

---

## 7. Project structure

As built (v1). The live map with links is `docs/INDEX.md`; agent rules are in `AGENTS.md`.

```text
Corta/
  AGENTS.md  CLAUDE.md  README.md  start.ps1  start.cmd  .env.example
  docs/                     ← design spec, architecture, content format, decisions log, how-to guides
  app/src/
    core/                   ← registry, content (schemas, loader, ID graph), progress, ruler, vars, markup, expr, render
    blocks/<type>/          ← one folder per block type (auto-discovered)
    kinds/                  ← node kind registry entries
    graphics-kit/           ← themed primitives for canvas modules
    theme/                  ← design tokens (single source)
    views/                  ← shell, home, semester, course, evaluation (notebook), calendar, panels
    calendar/  priority/  llm/   ← event-type, strategy and action registries
    state/  api/  i18n/
  server/src/               ← Hono API: SQLite (Drizzle + libSQL), Google Calendar push, LLM proxy
  shared/api.ts             ← API contract (Zod) shared by app and server
  content/semesters/<semester>/courses/<course>/
      course.yaml  sources.yaml  sources/  processed/
      evaluations/<eval>/ evaluation.yaml  topics/*.yaml  canvas/*.tsx  assets/
  skills/build-course/      ← the generation skill (SKILL.md + generated catalog.md)
  scripts/                  ← validate-content, gen-catalog, check-coverage, new-block, extract-pdf
  tests/                    ← Playwright e2e (ruler test, app flows)
  prototypes/notebook-page/ ← approved visual reference (unchanged)
```

## 8. Patterns & decisions to respect

| Pattern | Where | Rule |
|---|---|---|
| **Registry / plugin** | Blocks, node kinds, calendar event types | Extend by adding, never by editing a switch statement |
| **Composite** | Node tree, nested blocks | Same rendering and progress logic at every level |
| **Normalized ID graph** | Core | Every entity addressed by stable semantic ID; relations are edges, not copies |
| **Derived state** | Progress, overview, calendar items, LLM context | Store only leaves (what you checked); compute the rest |
| **Schema validation at the boundary** | Content loader | Invalid agent output fails loudly with a readable error, never renders silently broken |
| **Versioned schemas** | Every block + content file (`schema: 1`) | Migrations instead of breaking old courses |
| **Content / state separation** | Files vs SQLite | The skill never touches user state |
| **Single theme source** | Tokens | No hardcoded colors or sizes anywhere |
| **Measure, don't guess** | Ruler | Alignment comes from measured baselines, verified by the ruler test, never from hardcoded font offsets |
| **Docs as code** | `AGENTS.md`, `docs/`, block `docs` field | Every phase updates docs; agents never need to guess |

---

## 9. Roadmap

Each phase ends with something working and its docs updated.

| # | Phase | Delivers |
|---|---|---|
| 0 | **Scaffold** | Repo, stack, theme tokens, `AGENTS.md` + docs index, start script, prototype copied into `prototypes/` |
| 1 | **Content core** | Zod schemas, YAML loader, ID graph, registry, renderer, **notebook page + ruler + ruler test** (port of the prototype); blocks: `text`, `image`, layout blocks, `exercise`. Claude hand-writes **one real topic** from a current course to test the format |
| 2 | **State & progress** | SQLite, nested margin checklist, learned highlight, weighted propagation |
| 3 | **Visual blocks** | `graph2d`, `graph3d`, `diagram`, controls + shared variables, graphics kit, `canvas` |
| 4 | **Navigation** | Home, semester masonry, course page, evaluation page with overview (treemap / graph / tree) + click-to-scroll |
| 5 | **Time** | Calendar, day panel, classes/exams/submissions as entities, study sessions, Google Calendar one-way push |
| 6 | **Generation skill** | 11-step pipeline, ID reuse on updates, validation + coverage-audit scripts, scope per run |
| 7 | **LLM panel** | Context builder (visible/selected node, variables), chat side panel; actions later |
| 8 | **Smart layer** | Next-priority card, planning suggestions |

Phases 3–5 are independent of each other and can run in parallel or in any order.


## 10. Reading alongside the tutor

The shell reserves the final chat space in one layout change; the notebook's responsive layout
and ruler settle at the new width. Padding is never animated, which avoids repeated text reflow,
ruler passes and viewport measurements. The panel alone uses a short transform/opacity transition.
Desktop uses a right column; under 900px the panel docks below the reading viewport. Chat sizes and
motion are tokens, and reduced-motion skips the panel animation.
`views/shell/SettingsDialog.tsx` is the single preferences surface (theme, shortcut, connection).
Explicit fixed insets and auto margins center it independently of resets; short windows scroll its
contents. Native dialog behavior supplies focus containment and restoration; settings remain SQLite-backed.

Chat keeps follow intent in a ref, updated by the message list's scroll event. Streamed content only
scrolls to the bottom when that intent is active (within 48px of the bottom), with instant updates
before paint. Reading above pauses following through completion; returning to the bottom, sending,
clearing or reopening resumes it. This does not alter notebook focus or provider/tool behavior.

One `llm/viewport.ts` tracker per notebook batches scroll/resize/node-size measurements and exposes
a synchronous refresh through the page bridge. Context only accepts positive, finite visibility
scores and selection belonging to the current evaluation and visible screen. The chat reads a new
snapshot immediately before every provider request; tool rounds do not reuse the pre-action closure.
See [the tutor guide](guides/llm-setup.md#preferences-and-reading-context) for scoring and extension rules.
