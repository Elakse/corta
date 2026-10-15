# AGENTS.md: start here

**Corta** is Alejo's personal study platform. It compiles each course's real material (syllabus, classes, guides,
past exams) into interactive notebook pages with nested progress, a calendar, study planning and an LLM tutor.
Content is YAML written by a generation skill; user state lives in SQLite; stable node IDs connect them.

- Map of every doc and folder: [`docs/INDEX.md`](docs/INDEX.md)
- The *what*: [`docs/study_platform_design.md`](docs/study_platform_design.md) · the *how*: [`docs/architecture.md`](docs/architecture.md)
- Content YAML reference + block catalog: [`docs/content-format.md`](docs/content-format.md)
- Every implementation decision: [`docs/decisions-log.md`](docs/decisions-log.md)
- New class/video/PDF intake and approval-gated updates: [`skills/course-material-intake/SKILL.md`](skills/course-material-intake/SKILL.md)
- Source material on this computer: `../Facu/` (`<Documents>\Facu`), with PDP in `../Facu/PDP/`. This path is machine-specific; Alejo will specify it on other computers. See [`docs/guides/local-materials.md`](docs/guides/local-materials.md).

## Run

```powershell
.\start.ps1                 # Windows: installs deps if needed, runs app + API, opens the browser
npm run dev                 # app http://localhost:5173 (Vite) + API http://localhost:8787 (Hono)
```

## Test and validate

```powershell
npm run typecheck           # tsc strict: app, server, scripts, tests
npm test                    # unit tests (Vitest)
npm run validate            # content: schemas, IDs, sources, kinds, variables, tall math
npm run ruler               # ruler test (Playwright). First time: npx playwright install chromium
npm run test:e2e            # all browser tests
npm run catalog             # regenerate skills/build-course/catalog.md + docs/content-format.md catalog
npm run coverage -- <course-dir>   # fail if processed/coverage.md has unresolved items
npm run check               # typecheck + validate + unit + e2e
```

## Non-negotiable rules

1. **Registry pattern.** Blocks, node kinds, calendar event types, priority strategies, LLM actions and LLM
   providers are registries. Extending = adding a file/folder that registers itself. Never add a `switch` on a type elsewhere.
2. **Content ≠ state.** Content is files (`content/`), user state is SQLite (`server/`). The skill never touches state;
   the app never writes content. They meet only through IDs.
3. **Stable IDs.** Node IDs are meaning-based paths, unique across all content, never renamed once used
   (progress is keyed by them). Updates reuse existing IDs.
4. **The ruler test must pass** (`npm run ruler`). Every line of text sits on a rule. New blocks either mark their
   line holders (`data-rl`) or are snapped. Measure, never hardcode font offsets.
5. **Tall-math rule.** Inline math never stretches a line: matrices, `\frac`, sums with limits go in display math.
6. **Single theme source.** Colors/fonts/sizes come from `app/src/theme/tokens.ts`. No hardcoded colors.
7. **Never edit `content/**/sources/`** (original material, read-only) or `prototypes/` (approved reference).
8. **Docs as code.** Every change updates the relevant doc/guide, `docs/decisions-log.md` for decisions, and the
   status below. Regenerate the catalog after touching blocks or kinds.
9. **No course specifics in code.** Courses are data.
10. Never commit `.env`, API keys or OAuth tokens. Never push or force anything without Alejo's OK.

## How-to guides (`docs/guides/`)

add-a-block · add-a-diagram-shape · add-a-node-kind · add-event-type · add-priority-strategy · add-llm-action · build-a-course ·
google-calendar-setup · llm-setup · add-llm-provider · run-tests

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Scaffold, docs system, theme tokens, app shell + routing | ✅ done |
| 1 | Content core (registries, loader, ID graph), v1 blocks, notebook page, ruler + ruler test, sample course, catalog | ✅ done |
| 2 | State (Hono + SQLite), progress engine, margin checklist | ✅ done |
| 3 | Shared variables, visual/control/practice blocks, graphics kit, canvas | ✅ done |
| 4 | Navigation: evaluation overview (treemap/graph/tree), course page (compact info column, subtle evaluation accents), semester masonry | ✅ done |
| 5 | Calendar, day panel, study sessions, next priority, Google Calendar push | ✅ done |
| 6 | Generation skill `skills/build-course/` + incremental intake `skills/course-material-intake/` | ✅ done — new material is summarized and reviewed; course content changes require approval of concrete items |
| 7 | LLM side panel | ✅ done — reusable adapters, centered Settings with per-evaluation paper choice, saved provider/model + shortcut choices, reader-controlled streaming, responsive chat using spare desk space before narrowing the notebook + live reading context; Go activation needs a local key; chat images (files, paste, webcam photo; ≤3) + camera calibration dialog (see `docs/guides/camera.md`) |

## Public distribution

Course files and source material live locally under ignored `content/`. This repository ships no study
data. Synthetic test fixtures are in `tests/fixtures/`, enabled only in browser tests. Local prototypes
and agent output folders are excluded. See `docs/guides/publish-empty-app.md` before publishing.

Local intake status (2026-10-15): PDP's course info includes the official schedule, staff, regime,
TPs and evaluation dates. P1 now includes an independently reviewed supplement from 20 P1/transversal
channel videos; see `content/semesters/2026-C2/courses/pdp/processed/transcript-course-review.md`.
The P2 course has no notebook yet. Eight P2-related videos are inventoried and summarized, but P2
course changes are deferred until Alejo requests that pass.
Proba (2026-10-14): course info + Parcial 1 built (topics 0–8). Topic 8 (Normal/TCL) is provisional until the
professor publishes its class; guide exercises are limited to the prioritized ones (! and STOP). See
`content/semesters/2026-C2/courses/proba/processed/notes.md`.

Proba graphics (2026-10-14): rendering/layout reviewed across all 15 canvases and 7 diagrams;
exact disk/triangle supports, smooth continuous density/area paths, readable labels/markers and mobile
diagram reflow. Review full-size screenshots, including clipping by open solution containers; automated
bounds alone missed jagged edges in the first pass. Mathematical content and stable IDs are preserved.

Highlighter (2026-10-14): on mouse/pen screens the notebook uses Corta's own selection drawn as a marker
(`app/src/core/highlighter/`, prototype in `prototypes/highlighter-selection/`); no browser popups. Color in Settings.
Checks: typecheck, unit tests, `selection-menu`, `app`, `chat-ui` and `ruler` specs pass on a Linux copy.

Selection menu (2026-10-14): selecting notebook text offers Explicar / Fuente (registry in `app/src/llm/selection/`);
Fuente makes the tutor read the original material (`/api/sources`, tools `searchSources`/`readSourcePage`) and
cite it with chips that open the file at the page. Interactive blocks are unselectable (`interactive: true`).
Checks: typecheck, unit tests and `tests/selection-menu.spec.ts` pass on a Linux copy; `graphics.spec.ts` and
`math-labels.spec.ts` fail there with or without this change (WebGL/canvas label clipping in that sandbox).

Notebook notes (2026-10-14): red pencil notes reserve normal-flow space beside the heading, wrapping
to their own row when needed. Arrows and rotation are removed; body blocks keep the full writing
width and notes stay visible on phones. Alejo requested to do the visual and overlap reviews himself;
no tests or browser reviews were run for this change.
