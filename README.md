# Corta

A personal study platform: each course's real material (syllabus, classes, guides, past exams…) compiled into
interactive notebook pages, with nested progress, a calendar, study planning and an LLM tutor that knows what you're looking at.

## Quick start (Windows)

1. Install [Node.js LTS](https://nodejs.org) (20.19+ or 22+).
2. Double-click **`start.cmd`** (or run `.\start.ps1` in PowerShell). The first run installs dependencies.
3. Open <http://localhost:5173>.

The app starts with an empty study library. Your courses, source documents, progress, credentials, and
generated files stay local and are ignored by Git. See [`content/README.md`](content/README.md) to add content.
The synthetic course under `tests/fixtures/` is only enabled for tests.

Optional: the LLM side panel supports an OpenCode Go subscription or Anthropic API
([setup guide](docs/guides/llm-setup.md)); Google Calendar sync needs
OAuth credentials (`docs/guides/google-calendar-setup.md`). Both go in `.env` (created from `.env.example` on first start).

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | App (http://localhost:5173) + API (http://localhost:8787), hot reload |
| `npm run validate` | Check all course content (schemas, IDs, sources, tall math, variables) |
| `npm test` | Unit tests |
| `npm run ruler` | The ruler test: every line of text sits on a ruled line (needs `npx playwright install chromium` once) |
| `npm run test:e2e` | All browser tests |
| `npm run catalog` | Regenerate the block catalog the generation skill reads |
| `npm run check` | Everything above: typecheck, validate, unit and e2e tests |

## Where things are

Start at [`AGENTS.md`](AGENTS.md) (rules + status) and [`docs/INDEX.md`](docs/INDEX.md) (map of everything).
