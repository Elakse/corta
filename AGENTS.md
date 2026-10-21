# AGENTS.md: start here

**Corta** is Alejo's personal study platform. It compiles each course's real material (syllabus, classes, guides,
past exams) into interactive notebook pages with nested progress, a calendar, study planning and an LLM tutor.
Content is YAML written by a generation skill; user state lives in SQLite; stable node IDs connect them.

- Map of every doc and folder: [`docs/INDEX.md`](docs/INDEX.md)
- The *what*: [`docs/study_platform_design.md`](docs/study_platform_design.md) · the *how*: [`docs/architecture.md`](docs/architecture.md)
- Content YAML reference + block catalog: [`docs/content-format.md`](docs/content-format.md)
- Every implementation decision: [`docs/decisions-log.md`](docs/decisions-log.md)
- New class/video/PDF intake and approval-gated updates: [`skills/course-material-intake/SKILL.md`](skills/course-material-intake/SKILL.md)
- Source material on this computer: `../Facu/` (`C:\Users\alejo\OneDrive\Documents\Facu`), with PDP in `../Facu/PDP/`. This path is machine-specific; Alejo will specify it on other computers. See [`docs/guides/local-materials.md`](docs/guides/local-materials.md).

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

Tutor command (2026-10-21): a standalone trailing `-c` requests a concise answer via a Spanish instruction
expanded in `app/src/llm/message-commands.ts`. Plain questions, image messages and pinned-reference
questions use the same helper; quotes are never parsed as commands. See `docs/guides/llm-setup.md`.
Checks: typecheck, 6 context/bridge unit tests and 8 browser cases pass (command requests, pinned
reference and all 6 synthetic ruler variants). Live provider response brevity was not evaluated.

## Public distribution

Course files and source material live locally under ignored `content/`. This repository ships no study
data. Synthetic test fixtures are in `tests/fixtures/`, enabled only in browser tests. Local prototypes
and agent output folders are excluded. See `docs/guides/publish-empty-app.md` before publishing.

Git workflow (2026-10-20): local `main` uses the clean public history and tracks `origin/main`.
Use normal add/commit/push; personal material stays on disk, ignored and untracked. Do not force-add
ignored files or merge old private history. The previous history is backed up outside the repository.
Clean-export checks on Windows: typecheck, content validation, production build and empty-library smoke
pass; 142/143 unit tests and 49/52 browser cases pass, including all 16 synthetic ruler cases.
Outstanding: the existing Windows path expectation in `sources.test.ts`, clipped eigenvalue labels in
the synthetic mobile canvas, and missing 3D KaTeX labels in both math-label tests. No app code was
changed for this Git migration; real-course rendering was not part of the clean-export suite.

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

Referenciar (2026-10-20): third selection-menu button; it opens the tutor with the selection pinned above the input
for the reader's own question (decisions 102-103; `app/src/llm/selection/actions/reference.ts`, `ReferenceBar.tsx`).
Checks on a Linux copy: typecheck, unit tests and `tests/selection-menu.spec.ts` pass; `chat-ui` streaming-scroll case
failed once in a combined run and passed twice alone.

Reading position (2026-10-19): every notebook remembers where you were (node anchor in settings, `reading:<evaluation>`)
and restores it on reload or when you return from another screen; see `docs/architecture.md` §6 and decisions 93–96.
Checks: typecheck, unit tests, `tests/reading-position.spec.ts`, `app` and `selection-menu` specs pass on a Linux copy.

TDA TP2 (2026-10-19): the assignment is a notebook at `content/semesters/2026-C2/courses/tda/evaluations/tp2-entrega/`
(requirements as a checklist + a section on nine invisible passages found in the original PDF). It was built from the
reading copy, with no solutions; see `processed/notes.md` (TP2) and decisions 97-99. Checks: `npm run validate` passes
on a Linux copy; typecheck, unit and e2e tests were not run (content-only change).

Google Calendar setup (2026-10-19): supplied Web OAuth credentials are in local `.env`; `.codex-attachments/`
is ignored. The live API reports `configured: true`; account authorization and a completed sync remain
to be verified. Web clients require the exact callback in `docs/guides/google-calendar-setup.md`.

Tutor width (2026-10-19): desktop chat fills spare space beside the notebook up to 760px, preserving the
125% layout while widening at 100%. Checks on Windows: typecheck, all 5 chat UI cases and all 10
tutor-open ruler cases pass; 1504 / 1880px screenshots inspected. The full course ruler sweep was
stopped after 13 passing cases; it was not completed for this change.

Transcription trial (2026-10-20): TranscribeFlow processed a ten-minute Spanish TDA sample and exported
SRT, but technical vocabulary was repeatedly corrupted; it was not added as a validated skill fallback.
The literal channel selection (15 videos, one ambiguous other-course title) and trial evidence are in
`content/semesters/2026-C2/courses/tda/processed/material-intake/transcribeflow-test-2026-10-20/`.
No full-class/batch transcription or notebook updates were performed.

YouTube intake default (2026-10-20): `course-material-intake` prioritizes YouTube automatic captions in
the original language, preserving raw tracks, timestamps and ASR uncertainty. Creator captions or authorized
local/external transcription resolve missing or inadequate passages; decisive claims still require verification.

TDA external-video intake (2026-10-20): Buchwald channel selected as supplementary subject evidence only;
our own official sources determine applicability. Live inventory has 15 relevant videos through the 19/10
flow class (uploaded 20/10); 14 have Spanish automatic captions, while that newest class has no published
caption tracks. Originals, reading copies, summaries and incremental review history live under TDA's
`processed/material-intake/index.md`; keep later videos and the unresolved flow class open for future intake.
All 14 available transcripts now have subject summaries and an independent review against our sources.
Alejo approved R01–R04 on 20/10; all four are applied in the existing PD and BE nodes, preserving IDs:
counting/decision, reconstruction/memory dependencies, copying the saved best candidate and optional MRV.
Checks: source hashes, compatible text paths, timestamp/link bounds, content validation and the prior guide
coverage audit pass. The focused P1/P2 ruler sweep passed all 12 cases (1300/900/400px, light/dark),
with zero off-rule lines. Results and approval are recorded in the intake review.
