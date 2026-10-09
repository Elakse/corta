# AGENTS.md: start here

**Corta** is Alejo's personal study platform. It compiles each course's real material (syllabus, classes, guides,
past exams) into interactive notebook pages with nested progress, a calendar, study planning and an LLM tutor.
Content is YAML written by a generation skill; user state lives in SQLite; stable node IDs connect them.

- Map of every doc and folder: [`docs/INDEX.md`](docs/INDEX.md)
- The *what*: [`docs/study_platform_design.md`](docs/study_platform_design.md) · the *how*: [`docs/architecture.md`](docs/architecture.md)
- Content YAML reference + block catalog: [`docs/content-format.md`](docs/content-format.md)
- Every implementation decision: [`docs/decisions-log.md`](docs/decisions-log.md)

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
| 4 | Navigation: evaluation overview (treemap/graph/tree), course page, semester masonry | ✅ done |
| 5 | Calendar, day panel, study sessions, next priority, Google Calendar push | ✅ done |
| 6 | Generation skill `skills/build-course/` | ✅ done |
| 7 | LLM side panel | ✅ done — reusable adapters, provider/model selectors, saved per-provider choices; Go activation needs a local key |

## Public distribution

Course files and source material live locally under ignored `content/`. This repository ships no study
data. Synthetic test fixtures are in `tests/fixtures/`, enabled only in browser tests. Local prototypes
and agent output folders are excluded. See `docs/guides/publish-empty-app.md` before publishing.
