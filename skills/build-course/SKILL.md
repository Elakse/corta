---
name: build-course
description: Compile a university course's source material (syllabus, classes, guides, past exams, assignments) into Corta content (course.yaml, evaluations, topic YAML with nodes and blocks), for a given scope such as "course info + Parcial 1". Use when Alejo asks to build, extend or update a course in Corta.
---

# build-course

> **Core objective:** maximize coverage of everything needed to pass, faithful to the staff's terminology,
> notation, depth, priorities and way of evaluating.

You are not "making good notes". You are *compiling* a course: reading the whole corpus holistically,
reconstructing what the staff expects, and expressing it in Corta's content language so that nothing needed to
pass is lost, every claim is traceable to a source, and the result is pleasant to study on a notebook page.

Works with any agent that can read files and run commands. Paths are relative to the repo root (`Corta/`).

## Inputs

| Input | Example | Required |
|---|---|---|
| Course folder | `content/semesters/2026-C2/courses/pdp/` | yes |
| **Scope** of this run | `course info + Parcial 1` · `Parcial 2` · `TP 1` · `Final` | yes |
| Where the material is | `sources/` inside the course folder (copied there by Alejo or by you; never edited) | yes |

**Scope is binding.** Generate or change only what the scope covers. Course info (`course.yaml`, `sources.yaml`)
may always be refreshed. Never regenerate evaluations outside the scope.

## Read first

1. `docs/content-format.md`: the YAML format and every rule the validator enforces.
2. `skills/build-course/catalog.md`: the blocks and node kinds you can use (generated from the code: it's the truth).
3. If the course already has content: **all of it** (`course.yaml`, `sources.yaml`, existing topics, `processed/`).
4. One sample topic for style: `content/semesters/_sample/courses/algebra/evaluations/parcial-1/topics/autovalores.yaml`.

## Hard rules

1. **Never edit, move or delete anything in `sources/`.** It's the original material, read-only.
2. **Exercises come from the sources, never invented.** Every exercise node has `origin: { ref, locator }`
   pointing at the exact place (guide + number, past exam + item).
3. **Solutions follow the staff's conventions** (notation, steps, level of detail, style of their worked examples).
   If no source has an official solution, write one and mark it `basis: generated`. Official ones: `basis: official`
   with `ref`/`locator`.
4. **Every node has `sources`** with the right `basis`: `explicit` (stated in that source), `inferred` (you crossed
   several sources), `generated` (written to help study; `ref` may be omitted).
5. **Tall-math rule:** inline `$…$` must stay one line tall. Matrices, `\frac`, sums/integrals with limits,
   `\binom`, big delimiters → a `math` block or a `$$…$$` paragraph.
6. **Stable IDs.** Reuse existing IDs on updates: read current content first, match by *meaning*, and only mint
   IDs for genuinely new things. Never rename an ID that exists (user progress is keyed by it). Format:
   `<idPrefix>/<evaluation>/<topic>/<slug>`, kebab-case, unique across all content.
7. **Never touch user state** (the database, `server/data/`). Content only.
8. **Faithful language.** Write in the course's language with the staff's own terms, symbols and letter choices.
   Don't "improve" their notation.
9. **No course specifics in code.** If the content needs something the catalog can't express, use a `canvas`
   block or log it under "Missing blocks" in `processed/notes.md`. Don't hack around the validator.
10. Don't guess facts (names, dates, rooms, passing rules). If the material doesn't say, leave the field out and
    list it under "Questions for Alejo" in `processed/notes.md`.

## Working files (`<course>/processed/`)

| File | What |
|---|---|
| `inventory.md` | Every source file: path, type guess, pages/size, readable? (step 1) |
| `classification.md` | Each source's role and what it covers (step 2) |
| `text/` | Extracted text (`npm run extract -- <course>/sources`), page-marked, for reading and citing |
| `evaluated-content.md` | What is evaluated, with evidence (step 5) |
| `coverage.md` | The audit: every syllabus/guide/exam item → node ids, ❌ missing, or ⏭ out of scope (step 11) |
| `notes.md` | Ambiguities, conflicts between sources, questions for Alejo, missing blocks |

## Pipeline

Do the steps in order. Each one leaves its trace in `processed/`. Steps 1–8 are analysis: write no content yet.

### 1. Inventory
List every file under `sources/` (recursively). Extract text from PDFs with `npm run extract -- <course>/sources`
(output in `processed/text/`). For other formats (pptx, docx, images, code repos) read them with whatever tool you
have; note anything unreadable. Write `inventory.md`. *Nothing important may be silently ignored.*

### 2. Classification
For each source: syllabus, schedule, bibliography, class (theory/practice), guide, past midterm/final,
solution, assignment, supplementary. Register them all in `sources.yaml` (`id`, `path`, `kind`, `title`, `short`).
`short` is what the page prints next to a node ("Teórica 3"). Write `classification.md`.

### 3. Reconstruction
From syllabus, schedule and announcements: the course's real name and code (from the material, not the folder
name), staff, locations, modality, class schedule (weekly slots, date ranges, exceptions), evaluations (kind,
date, time, location, scope, passing requirements), promotion regime, bibliography, links. Write/refresh
`course.yaml` and the semester's `semester.yaml` (create it if missing; holidays if the material lists them).

### 4. Cross-referencing
Never trust one document. The syllabus names topics; classes show depth and notation; guides show the expected
skills; past exams show what is really tested. Record conflicts (e.g. syllabus vs. class order) in `notes.md`
and how you resolved them.

### 5. Identify what's evaluated ⭐
For the scope: what must be known, understood, proven, calculated, implemented, solved or recognized to pass.
Use past exams and guides as the main evidence: recurring question types, required proofs, typical exercises,
traps. Write `evaluated-content.md` (item → evidence → how it's asked).

### 6. Decomposition
Turn it into the academic structure: Evaluation → Topic (one YAML file each, `kind: section`) → Concept →
Definition / Property / Theorem (+ proof child) / Method / Example / Exercise. Use node kinds from the catalog.
Containers (sections) have no own checkbox; every piece of content belongs to some checkable node.

### 7. Relevance
Set `weight` (a multiplier, default 1) where something matters more or less than its size suggests: frequency in
past exams, number of guide exercises, emphasis in classes, prerequisite importance. Keep most nodes at 1.
Add `relations` (`prerequisite`, `uses`, `example-of`, `tested-in`…) between nodes; they drive the dependency graph.

### 8. Pedagogical order
Order topics (in `evaluation.yaml`) and nodes (in each body) for learning, respecting prerequisites, not
document order. Exercises go right after what they practice (or in a practice section per topic).

### 9. Content generation
Write the topic files. For each node, choose blocks from the catalog:
- `text` for prose (Markdown + math, `==highlight==` for key terms), `math` for display formulas, `table`,
  `code` (the staff's language and style), `callout` (`warning` for common mistakes, `exam` for "how it's asked").
- Visualize whenever it helps understanding: `graph2d` (functions, vectors, regions), `graph3d`, `diagram`
  (Mermaid: flows, UML, state machines, trees), controls (`slider`, `toggle`, `input`) wired through page `vars`
  so a change updates graphs and text (`{{var}}`). Freeform ideas → `canvas` (TSX module in `canvas/`, see
  `docs/guides/add-a-block.md#canvas-modules-freeform-graphics`).
- Proofs: a child node `kind: proof` whose body is a `collapsible`.
- Exercises: a node `kind: exercise` with `origin`, the statement as blocks, then an `exercise` block with the
  hidden solution (`basis`).
- Alternative explanations: `tabs`. Side by side: `columns`.
- Keep paragraphs short; one idea per node. Pencil `note` only for the single most common trap of a node, in
  ~20 characters. It reserves space beside the heading, or in its own row below the heading when there
  is not enough room; it has no arrow and remains visible on small screens. Put longer explanations
  in body blocks instead.
- Canvas modules: size labels from the `width` prop and keep wide drawings out of `columns`, so they stay legible
  - Mathematical labels (diagrams, plot/vector/point labels, titles, controls and canvas readouts) use
    explicit `$TeX$`. Quote diagram labels; use `kit.Label`, `kit.MathText` or `kit.SvgMathLabel`, and
    measure rendered formulas in both dimensions. Keep formulas whole when wrapping. Programming
    names and code stay literal. See `../../docs/guides/math-labels.md` for examples and verification.
  on a phone.

### 10. Source linking
Every node: `sources: [{ ref, page | locator, basis }]`. Prefer the most specific location (page, slide, item).

### 11. Coverage audit
A second full pass over **all** sources in scope, comparing them against the final structure. In
`processed/coverage.md`, under `## Items`, a table with one row per syllabus item, guide exercise and past-exam
question in scope:

```markdown
## Items

| # | Item (as the source says it) | Source | Evaluated? | Node ids |
|---|---|---|---|---|
| 1 | Polimorfismo paramétrico | programa · U2 | parcial-1 | `pdp/p1/tipos/parametrico` |
| 2 | Guía 2 · Ej. 5 | guia-2 | parcial-1 | `pdp/p1/tipos/ej-g2-5` |
| 3 | Mónadas | programa · U5 | parcial-2 | ⏭ out of scope (Parcial 2) |
```

Fix every gap (❌) by adding content, then re-audit. Finish with a short summary at the top: counts, what's
under-represented, open questions.

## Checks before you finish (all must pass)

```powershell
npm run validate                                   # schemas, IDs, sources, kinds, variables, tall math (0 errors; fix warnings too)
npm run coverage -- content/semesters/<sem>/courses/<course>   # no unresolved items
npm run ruler                                      # every line on the rules (new pages are picked up automatically)
npm test
```

Then open the page (`npm run dev` → the evaluation) and skim it as a student would.

## Updating a course later (incremental)

1. Read the existing content and `processed/` first. 2. Inventory only new/changed sources, but re-run
cross-referencing and the coverage audit for the scope. 3. Reuse IDs (match by meaning); add new nodes with new
IDs; if something is truly removed from the course, delete its node (progress for that ID simply stops showing).
4. Never rename IDs, never touch user state. 5. Log what changed in `processed/notes.md`.

## Report to Alejo (end of run)

Short and plain: what was built (topics, nodes, exercises, visuals), coverage summary, anything ambiguous in the
material, missing blocks the content wanted, and questions only he can answer.
