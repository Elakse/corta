# Run tests

| Command | What | Needs |
|---|---|---|
| `npm run typecheck` | `tsc` (strict) over app, server, scripts, tests | |
| `npm test` | Vitest unit tests (`*.test.ts` next to the code) | |
| `npm run validate` | Content validation (same checks as the app) | |
| `npm run ruler` | **The ruler test**: every text line, display formula and table row of every evaluation page sits SINK (2px) above a rule (±1px), all collapsibles open, light + dark, 1300 / 900 / 400 px | Chromium for Playwright |
| `npm run test:e2e` | All Playwright tests (ruler + app flows) | Chromium for Playwright |
| `npm run check` | All of the above | |

First time only: `npx playwright install chromium`. In sandboxes with a preinstalled Chromium, set
`CORTA_CHROMIUM=<path to chrome>` instead.

E2E tests start their own app (port 5174) and API (8788) with a throwaway DB (`server/data/e2e.db`), so they
never touch your progress. If a ruler test fails it prints the offending lines (`[kind, text, offset]`); the
expected offset is `u − 2` (28 at 30px lines).

If another server already owns those ports, use `CORTA_TEST_APP_PORT` and `CORTA_TEST_API_PORT` to choose
fresh ports (e.g. 5194 / 8794). Reusing an unrelated Vite server can render content while proxying API
requests to the wrong backend. Run one browser suite at a time: suites share the throwaway DB.

Ruler checks are read-only and can run in parallel with
`npm run ruler -- --workers=4 --fully-parallel` on a machine with sufficient memory. Keep app-flow tests
sequential because they modify the shared test state.

Browser tests enable synthetic content from `tests/fixtures/content/` using `VITE_CORTA_TEST_CONTENT=1`.
Normal runs and production builds leave that fixture out. Ruler checks also pick up any local evaluation
pages automatically (`tests/pages.ts` scans both the fixture and `content/`).
