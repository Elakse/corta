# Docs index

Hierarchical map of the project. Agents: read `../AGENTS.md` first.

## 1. Overview
- [`study_platform_design.md`](study_platform_design.md): the *what*: vision, principles, screens, generation pipeline, **§11 decisions**, §12 open questions.
- [`architecture.md`](architecture.md): the *how*: content model, block registry contract, stack, notebook page / ruler / checklist, patterns, roadmap.
- [`decisions-log.md`](decisions-log.md): every decision and assumption taken during implementation (dated, with the why).
- Original brainstorms and implementation prompts are local-only (ignored).

## 2. Frontend (`app/src/`)
| Folder | What lives there | Start with |
|---|---|---|
| `core/registry/` | Generic registry + `defineBlock` / `defineKind` contracts | `blocks.ts` |
| `core/content/` | Zod schemas, pure loader (`build.ts`), ID graph, Vite glob adapter, content store | `build.ts` |
| `core/ruler/` | The ruler engine (framework-agnostic) + `useRuler` | `engine.ts` |
| `core/progress/` | Progress engine (pure) + trees from content | `engine.ts` |
| `core/vars/` | Shared page variables store + hooks | `store.ts` |
| `core/markup/` | Markdown + KaTeX rendering, `{{var}}`, tall-math detection | `render.ts` |
| `core/expr/` | Expression language for graph props | `index.ts` |
| `core/render/` | `BlockView` / `BlockList` (registry-driven rendering, snap wrapper, error boundary) | `BlockView.tsx` |
| `blocks/<type>/` | One folder per block type | `text/`, `graph2d/` |
| `kinds/` | Node kinds | `knowledge.ts` |
| `graphics-kit/` | Themed SVG primitives for canvas modules | `index.ts` |
| `graph/` | Diagram engine: Mermaid-subset reader, layered layout (pure), SVG view, shape registry | `layout.ts`, `GraphView.tsx` |
| `ui/` | Shared UI pieces: `Surface` (solid card for code/tables/diagrams), `Progress` | `Surface.tsx` |
| `theme/` | Design tokens (single source) | `tokens.ts` |
| `views/` | Screens: `shell/`, `home/`, `semester/`, `course/`, `evaluation/` (notebook + overview), `calendar/`, `panels/` | `evaluation/Notebook.tsx` |
| `calendar/` | Calendar event-type registry + derivation | `types/` |
| `priority/` | Next-priority strategy registry | `strategies/` |
| `llm/` | Context builder, chat panel, action registry | `context.ts` |
| `state/`, `api/`, `i18n/` | Zustand stores, typed API client, UI strings (es/en) | |
| `setup.ts` | Composition root: fills all registries, loads content | |

## 3. Backend (`server/src/`)
- `app.ts`: routes (`/api/progress`, `/settings`, `/sessions`, `/annotations`, `/gcal`, `/llm`).
- `db/`: Drizzle schema (user state only) + libSQL client; migrations in `server/drizzle/` (`npm run db:generate`).
- `gcal/google.ts`: one-way push to the dedicated "Corta" calendar.
- `llm/`: provider registry and profiles (Anthropic, OpenCode Go, mock), reusable protocol `adapters/`;
  settings API persists provider/model selections without exposing credentials.
- `shared/api.ts` (repo root): the API contract both sides use.

## 4. Content (`content/`)
- [`content-format.md`](content-format.md): full YAML reference + generated block/kind catalog.
- `content/`: local, ignored study library; ships only a README.
- `tests/fixtures/content/semesters/_sample/`: synthetic test course, enabled only for tests.

## 5. Generation skill (`skills/build-course/`)
- `SKILL.md`: the 11-step pipeline, hard rules, scope per run.
- `catalog.md`: generated vocabulary (`npm run catalog`).

## 6. Guides (`guides/`)
| Guide | When |
|---|---|
| [`add-a-block.md`](guides/add-a-block.md) | New visual/interactive component |
| [`add-a-node-kind.md`](guides/add-a-node-kind.md) | New academic primitive (lemma, algorithm…) |
| [`add-a-diagram-shape.md`](guides/add-a-diagram-shape.md) | New node outline for diagrams (hexagon, cylinder…) |
| [`add-event-type.md`](guides/add-event-type.md) | New kind of calendar event |
| [`add-priority-strategy.md`](guides/add-priority-strategy.md) | New "what's next" algorithm |
| [`add-llm-action.md`](guides/add-llm-action.md) | New thing the LLM can do in the UI |
| [`add-llm-provider.md`](guides/add-llm-provider.md) | New tutor connection using reusable protocol adapters |
| [`build-a-course.md`](guides/build-a-course.md) | Turn a course's sources into content |
| [`google-calendar-setup.md`](guides/google-calendar-setup.md) | OAuth credentials for the sync |
| [`llm-setup.md`](guides/llm-setup.md) | OpenCode Go subscription or Anthropic API setup for the side panel |
| [`run-tests.md`](guides/run-tests.md) | Unit, ruler and e2e tests |

## 7. Prototype
- `../prototypes/`: optional local design references, ignored and not distributed.

- [`guides/publish-empty-app.md`](guides/publish-empty-app.md): public distribution and local-data exclusions.
