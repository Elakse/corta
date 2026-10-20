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

`tests/graphics.spec.ts` captures every canvas and diagram at 1440 / 900 / 400px, including every
selector mode on desktop light and phone dark. It checks SVG text bounds, overlapping canvas labels,
invalid paths, canvas overflow and clipping by ancestor containers. Inspect the resulting full-size
PNGs in `.transfer/graphics-review/<evaluation>/`; automated geometry checks cannot judge a jagged
curve, misleading fill or unreadable color. Use `npm run test:e2e -- tests/graphics.spec.ts -g '<evaluation>'`
for a focused review, and `CORTA_GRAPHICS_WIDTH=400` for only the phone profiles. This test uses the
throwaway database and makes no writes to personal progress.


`tests/reading-position.spec.ts` scrolls into the sample notebook, reloads and leaves for Home and back, and checks the node returns to the same screen position (and that the top is remembered too).

Tutor regressions in `tests/app.spec.ts` exercise full-card navigation, Settings persistence and
shortcut recording/disable, desktop/mobile panel placement, scrolling without clicking, a scroll
and submit in the same browser task, and fresh variables/focus after tool actions. They use the
mock provider (or an intercepted stream) and the throwaway database; no paid inference is needed.
App tests reset the shortcut so saved state from a previous test cannot disable later keyboard tests.
`tests/ruler.spec.ts` also measures the synthetic notebook with chat open at 1300 / 900 / 400px in
both themes, after the layout and ruler settle.

`tests/chat-ui.spec.ts` holds the scrolling/layout regressions: a controlled SSE response through
the real client parser stays open while the reader scrolls up, appends more content and returns to
the bottom (1440 / 400px). It also checks scroll preservation through completion, following after
a new question, Settings centering at 1440×950 / 400×850 / 400×480, and notebook width sampled over
the entire panel entry. Width changes once, rather than on every animation frame; reduced motion
disables panel animation. These tests use the mock connection and the same throwaway database.
The spare-space check covers 1440, 1504, 1530, 1880 and 2350px: full notebook width, no overlap,
the 760px panel ceiling, and viewport widths equivalent to 125% / 100% zoom on an 1880px screen.

Verification on 2026-10-19 for tutor width: strict typecheck, all five chat UI cases and all ten
`ruler with tutor` cases passed on Windows. The 1504 / 1880px layout screenshots were visually
inspected. The full course ruler sweep was stopped after 13 passing cases (sample, PDP and the
first Proba case); the remaining full-course cases were not completed for this change.


`tests/chat-images.spec.ts` covers the send button's vertical centering, attaching and pasting images
(limit 3, request body, history kept), the photo-only default prompt, the `images_unsupported` message,
the camera setup dialog (flip, A4 proportion, persistence, reset) and the capture dialog (Escape).
Camera tests launch Chromium with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`
and software WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`). If Playwright's Chromium
can't be downloaded, set `CORTA_CHROMIUM` to an installed Chromium binary.

Verification on 2026-10-13 for Home / Settings / tutor context: strict typecheck passed,
77 unit tests passed, content validation returned zero errors/warnings, and all 15 app-flow tests
passed. All 30 ruler cases were verified (24 across the synthetic and local evaluation pages,
6 with chat open); one parallel startup timed out waiting for `.flow` and passed on an isolated
retry with 106 lines and zero alignment deviations. The other 29 cases passed in the parallel run.
Desktop screenshots were visually inspected in light and dark; the mobile dock was inspected in dark.

Verification on 2026-10-13 for chat scrolling / Settings centering / panel performance: strict
typecheck and all 77 unit tests passed; all 15 existing app flows and all four new UI regressions
passed. The complete 30-case ruler run passed with zero alignment deviations (real PDP/TDA pages
and synthetic pages, both themes, 1300 / 900 / 400px, including the six chat-open checks). The
stream remained open while scroll preservation and resumed following were verified on desktop
and phone. Notebook width sampling recorded only the initial and final widths during entry.
Centered desktop Settings, the scrollable short-phone dialog and notebook/chat placement were
visually inspected. Browser checks used the mock provider or controlled SSE and the test database.

Verification on 2026-10-14 for Proba graphics: strict typecheck and all 78 unit tests passed;
content validation returned zero errors/warnings. All 36 ruler cases passed, including the six Proba
cases (1300 / 900 / 400px, light and dark). The graphics review captured every one of the 15 local
canvases and 7 diagrams at 1440 / 900 / 400px, then 84 mode/size/theme combinations; no page errors,
invalid SVG paths, clipped text or canvas overflow remained in the mode checks. All six drag controls
updated continuously after marks redrew; the 20 sliders were checked at both endpoints on a 400px
viewport without label clipping or overflow. Contact sheets and individual screenshots were visually
inspected in light/dark on desktop/phone. Evidence is local under `.transfer/proba-graphics/`.
Browser review intercepted writes; ruler tests used the throwaway database.

The second rendering review on 2026-10-14 corrected jagged uniform supports, noisy transformation
density paths, label/marker collisions and clipping inside mobile solutions. The 142-view graphics
review was supplemented by final 71-view phone and 22-view tablet reruns with ancestor-clipping checks;
all returned zero issues. Individual full-size images were inspected, rather than relying on contact
sheets. All 84 unit tests, strict typecheck and content validation passed; 120 original calculations and
distribution fields compared equal to the pre-edit copies. The six drags and all 20 sliders at both
endpoints were rechecked successfully. Images/reports are under `.transfer/graphics-review/`; scalar comparison and
interaction evidence are under `.transfer/proba-graphics/`.
The complete 36-case ruler run passed during this review; after the final mobile diagram changes,
both affected Proba 400px cases passed again, checking 6,882 lines per theme with zero deviations.

Notebook/tutor spacing verification (2026-10-14): strict typecheck and both focused layout browser
tests passed. At 1440/1530px, opening chat preserves the full notebook width with a 12px gap; at
1300px, the narrower layout changes width once and honors reduced motion. All 10 tutor-open ruler
cases passed (1300/900/400/1440/1530px in light/dark). The updated layout was also inspected on
Alejo's existing 1530px Edge viewport; screenshot: `.transfer/notebook-spacing/after.png`.

Paper preference relocation (2026-10-14): strict typecheck, the existing per-evaluation paper
persistence browser test (now using Settings), and all six synthetic notebook ruler cases passed.
The control's placement and saved grid selection were visually inspected in the existing Proba
notebook. Screenshot: `.transfer/paper-settings/after.png`.
