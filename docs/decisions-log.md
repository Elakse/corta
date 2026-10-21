# Decisions log

Every decision or assumption made during implementation that the design docs didn't fix, newest last.
Format: date · decision · why.

## 2026-10-07 · v1 build

| # | Decision | Why |
|---|---|---|
| 1 | **Built in a cloud workspace and delivered to the `Corta` folder as a git repo**; phases were implemented in one pass and committed as separate, phase-labeled commits. The phase gate (typecheck, unit, ruler, e2e) was verified on each phase's final tree. | Long multi-step build; keeps `node_modules` (Linux binaries) out of OneDrive. `start.ps1` installs Windows dependencies on first run. |
| 2 | **One root `package.json`** (no workspaces). App = Vite root `app/`, server run with `tsx`, scripts with `tsx` + Vite SSR. | Simplest for Windows/PowerShell and for agents; one `node_modules`. |
| 3 | **SQLite via `@libsql/client`** instead of `better-sqlite3`. | libSQL ships prebuilt Windows binaries (no Visual Studio toolchain); `better-sqlite3` can't be verified to build on Alejo's machine from here. The prompt's fallback, chosen upfront. Drizzle supports both identically. |
| 4 | Versions: Vite 8, React 19.3, TypeScript 7, Tailwind 4, Zod 4, Vitest 5, Playwright 1.63 (current on 2026-10-07). `use-resize-observer` (via Mafs) is overridden to React 19; nested KaTeX deduped. | Current stable releases; overrides silence peer conflicts and an advisory. |
| 5 | **Body items are validated by a registry-driven walker**, not a literal `z.discriminatedUnion`. It looks up `{ <type>: props }` in the block registry and validates props with that block's Zod schema. | Same source of truth (the registry), but errors are readable ("unknown block type "graf2d", did you mean graph2d?") instead of Zod's union noise. |
| 6 | Blocks declare nested lists via `children(props)`; **nodes can't be nested inside blocks** (only in node bodies). | Keeps the checkbox/margin model simple: every node is in the main flow. Proofs are child nodes whose body is a collapsible. |
| 7 | Block contract extended with `group`, `ruler` (`self` = marks its own line holders, `snap` = rounded to whole lines), `card`, `children`, `size`, `markup`, `example`. | The ruler, catalog, validator (tall math, `{{var}}`) and weights all need them; still one folder per block. |
| 8 | **Ruler holders are DOM attributes** (`data-rl="text|math|table|snap"`); the engine knows nothing about blocks. Inline KaTeX is wrapped in a zero-height inline-block so it never stretches a line. | Framework-agnostic and extensible: a new block opts in by marking its elements. Verified by the ruler test (measured baselines, no font offsets). |
| 9 | **Weights are relevance multipliers**: effective weight = size derived from content (blocks' `size`) × `weight` (default 1). Progress % is the weighted average of a node's own content and its children. | The skill can say "twice as important" without knowing absolute size units; size still comes from content as the docs ask. |
| 10 | `sources[].ref` may be omitted when `basis: generated`. | "Generated for study" content has no source to cite; forcing a fake ref would hurt traceability. |
| 11 | Exercise = node `kind: exercise` with `origin` (kind field) + an `exercise` block (statement, hidden solution with `basis: official|generated`, "Lo resolví bien"). The `exercise` block was built in Phase 1 (architecture.md roadmap lists it there). | Matches both docs; the sample course needs it. |
| 12 | Kinds carry per-language labels (`label: { es, en }`); the course's `language` picks them. **UI chrome strings are in Spanish by default** with an English dictionary (`app/src/i18n`, setting `locale`). | Courses are in Spanish and the prototype UI is Spanish; nothing course-specific is hardcoded. |
| 13 | Fonts are bundled with `@fontsource` (Literata, Bricolage Grotesque, Caveat, JetBrains Mono) instead of Google Fonts. | Works offline; deterministic ruler measurements. |
| 14 | Page variables can be numbers, booleans or strings. Canvas modules may write strings (e.g. readouts shown by text blocks via `{{var}}`). Expressions in graph props are JS expressions with Math functions and variables in scope (`core/expr`). | The eigen demo needs live readouts in text; content is local and trusted. |
| 15 | Section numbers are automatic (topic index, then `n.m`), overridable with `number`. The sample keeps the prototype's 3.1/3.2. | |
| 16 | Long pages: topics mount lazily (IntersectionObserver, 1600px margin, first two eager); scrolling to an unmounted node mounts its topic first. The ruler test scrolls to mount everything. | Keeps long evaluations fast without virtualization complexity. |
| 17 | e2e tests run their own servers on ports 5174/8788 with a throwaway DB (`server/data/e2e.db`). | Tests never touch real progress. |
| 18 | Updated the one cross-reference inside `prototypes/notebook-page/README.md` (`architecture.md` → `docs/architecture.md`); the prototype itself is untouched. | "Update every cross-reference" vs "do not modify the prototype": a path fix in its README, not the prototype. |
| 19 | Calendar events are derived by **event-type plugins** (`app/src/calendar/types/`); evaluation colors everywhere come from the event type that lists the evaluation kind. The sample semester only shows in the calendar/Home when no real semester exists. | One source for colors and derivation; the sample doesn't pollute real planning. |
| 20 | Google push is **app-derived**: the app computes the events and POSTs them; the server only upserts/deletes by entity id (`gcal_links` with a content hash). OAuth scope `calendar.app.created`; tokens in the settings table under `secret.*` (never served by the settings API). | Derivation stays in one place (the app); the narrow scope guarantees other calendars are untouchable. |
| 21 | Priority v1 (`deadline-pressure`): remaining weighted content ÷ (days left + ½ × planned hours); evaluations without content = 8 units; 60-day horizon; retakes count only after the original date. | Simple, explainable, tunable later (open question). |
| 22 | LLM: default model `claude-sonnet-5-5` (Anthropic models overview, 2026-10-07: best speed/intelligence balance for an interactive panel); override with `CORTA_LLM_MODEL`. The agent loop runs in the app (server is a stateless streaming proxy); actions run client-side. A `mock` provider exists for tests/offline. | Key stays server-side; actions need the UI state; deterministic e2e. |
| 23 | Chat shortcut `Ctrl/⌘ + J`; "this" = clicked node, else the most visible non-container node. | |
| 24 | PDF text extraction uses `pdfjs-dist` (pure JS) into `processed/text/` with page markers. | Works on Windows without native tools; page markers make citing pages easy. |
| 25 | Annotations (personal notes) have an API and table but no UI yet. | How annotations should work is still an open question in the design doc. |
| 26 | Non-notebook screens: paper-like surfaces on the desk color, Bricolage display type, mono metadata, Caveat accents; the priority card is inverted (ink) to stand out; motion via `motion` (staggered rises, shared-layout segmented controls, directional month transitions). | Consistent with the notebook tokens; screen design remains open for Alejo's taste. |
| 27 | Vite/Vitest aliases go through `normalizePath` (forward slashes). | On Windows `fileURLToPath` returns backslashes and `@/…` imports failed to resolve on the first real launch. |
| 28 | **Ruler passes are incremental**: a holder is re-measured only when its width, height or position within a rule changed, or a mutation touched it; the engine discards the mutation records of its own baseline probes. | The probes' own `childList` records re-scheduled a full pass every frame (invisible on the sample, ~1 s per frame on the 190-node PDP page). Snapped blocks shift content by whole rules, so unchanged holders stay aligned. |
| 29 | **Mermaid diagrams render when they come near the viewport** (IntersectionObserver, 1200 px), and `useTokens` keeps its object identity while values don't change. | Each render is a long task; a page with ~60 diagrams queued seconds of work on load and re-rendered all of them on every window resize. |
| 30 | The e2e `openNotebook({ openAll })` opens solutions in one DOM batch per nesting level and mounts lazy topics from inside the page; ruler tests get 6 minutes each. | Clicking ~130 toggles one by one (scroll + actionability per click) blew the 3-minute budget on a real course page, and a placeholder could vanish between a count and a locator action. |
| 31 | The Home e2e test no longer assumes the sample semester: it opens today's day instead of jumping to a sample midterm. | Home shows the real active semester once a real course exists. |
| 32 | Pencil notes are capped at 140 px and hidden when the flow is narrower than 760 px (container query on `.flow`); course notes stay short (~20 characters). | The note sits in the room the 68ch text column leaves on the right (~145 px at full width); longer notes covered body text. |
| 33 | TDA texts were extracted with `pdftotext -layout` page by page (same `=== page N ===` format as `npm run extract`) and checks ran on a Linux copy of the repo; the ruler ran in a cloud sandbox. Practice exercises live in their own topic file per module (`*-practica.yaml`), titled "name · ej. N ★" so the treemap shows the name first. | The repo's `node_modules` are Windows binaries; one practice file per module keeps topic files readable (TDA has 58 guide exercises). |
| 34 | TDA evaluations renamed to `parcial-1` / `parcial-2` (not "Parcial 1, partes 1 y 2"). Every topic sets an explicit `number` when the first topic overrides its own number (`el-parcial` is `0`). Canvas labels adapt below 520 px (shorter footer, optional notes hidden). | Matches the course calendar's naming; auto-numbering is index + 1, so one override shifted every other topic; narrow cards clipped the long labels. |
| 35 | **Code, tables and diagrams sit on a solid `Surface` card** (`app/src/ui/Surface.tsx`, styles in `ui/surface.css`) instead of directly on the ruled paper. Blocks opt in with `surface: true` (+ `ruler: "snap"`), which only adds the spacing around the card; the block draws its own `Surface`. New tokens `code`, `thumb`, `thumb-hover`. | Ruled lines running through code and tables were distracting. A card hides them; whole-line snapping keeps the text after it on the rules, and the ruler test passes unchanged. |
| 36 | **Table rows no longer hang under a rule**: a tall cell (matrix, fraction) simply makes its row taller. `data-rl="table"` stays in the ruler engine and its guide, but no built-in block uses it now. Short rows are padded to the header width; `caption` is finally rendered. | The hanging-row trick only existed to keep the grid readable through the table; on a solid card it just made rows uneven. |
| 37 | **Diagrams: our own engine for flowcharts and state diagrams** (`app/src/graph/`). `parseMermaid` reads the Mermaid subset the courses use into a `GraphSpec`; `layoutGraph` (pure, tested) does layered layout with lanes for long edges, parallel edges bowing apart and room for edge-label chips; `GraphView` draws it. Anything it does not fully understand (class, sequence, subgraph, styling) returns `null` and **falls back to Mermaid** in the same card. Existing courses are untouched. Node shapes are a registry (`graph/shapes/<name>.shape.ts`, see `guides/add-a-diagram-shape.md`); tones and edge styles are CSS classes. | The Mermaid output could not match the notebook's look and its routing crossed nodes. 15 of the 49 current diagrams use the supported subset (12 flowcharts, 3 state diagrams); the 31 class and 3 sequence diagrams stay on Mermaid until a UML renderer is worth building. A sweep over every real diagram found no node overlaps and no edge through a node. |
| 38 | Hovering a node lights **every path through it** (all ancestors and descendants); in graphs with cycles (state machines) only its direct neighbours, since the "paths" would be the whole cycle. Cycle-closing edges are drawn solid with the arrowhead at the other end. | Makes flow networks readable at a glance; dashed back edges would have suggested "optional" in state machines. |
| 39 | **Scrollbars are global and tokenized**: a 2px hairline track with a chunky rounded handle (16px hit area, 8px visible), `thumb`/`thumb-hover` tokens, blue while dragging; `scrollbar-width: thin` in Firefox. | Easy to grab, but quiet. One rule for every scrollable area (code, tables, diagrams, the page). |
| 40 | **Logo: the cut tile.** A heavy italic "c" (Bricolage Grotesque ExtraBold outline) on a rounded tile, cut by one diagonal; the right half sits a step lower and settles on hover of the brand link. In the app it uses the theme tokens (`ink`, `pen`, `paper`) so it flips with light/dark; `app/public/favicon.svg` is the same mark with fixed light-theme colors. | "Corta" is also the Argentine closer ("¡corta!": that's that, said with swagger), so the logo is a confident cut rather than a literal scissors or punctuation. Chosen by Alejo from ~40 explored directions. Files: `app/src/views/shell/Logo.tsx`, `app/public/favicon.svg`, `.brand .logo-half-r` in `app.css`. |
| 41 | The evaluation overview has a hide/show toggle (eye button right of the view selector, setting `overview.hidden`). Hidden = the stage is not mounted; picking a view re-shows it. No collapse animation. | The overview rendering is rough for now (to be redesigned); this lets the notebook take the whole screen meanwhile. Unmounting skips the expensive treemap/graph work, and an animated collapse would shift the page every frame and re-trigger ruler passes. |

## 2026-10-09 · OpenCode Go tutor

| # | Decision | Why |
|---|---|---|
| 42 | Add `opencode-go` through the provider registry, using native fetch and Go's fixed Chat Completions endpoint; default `deepseek-v4.1-flash`. No redirects, retries or paid fallback. | Alejo selected his existing $10 Go subscription. Keeps Corta's context/actions and avoids another runtime dependency. Account-side “Use balance” must be disabled separately; permitted general tutoring usage remains unconfirmed by Go docs. |
| 43 | Translate assistant tool calls and tool results at the provider boundary; assemble/validate streamed calls before emitting any. Explicit non-thinking mode, conversation UUID passed through `x-opencode-session`. | Preserves the existing client-side tool loop; reasoning history is outside the current chat contract. Stable sessions match Go's integration requirements. Incomplete streams must never execute page actions. |
| 44 | Separate reusable protocol adapters from registered provider profiles. Expose public profile metadata and provider/model controls in the tutor; persist selection and last model per provider in SQLite. Every request pins its choice, with no automatic fallback. | Alejo requested easy swapping. Adding a compatible provider reuses transport code and requires no frontend edits. Per-provider defaults prevent a global DeepSeek override from leaking into Anthropic. Keys stay on the server. |
| 45 | Publish the empty application without local course/history data. Ignore the study library, references, private state and generated files. Keep a synthetic test course under `tests/fixtures/`, enabled only for tests. Publish from a separate checkout based on GitHub's existing main branch. | Alejo requested a reusable empty app. Ignoring files cannot remove private material from existing Git history; a clean export avoids uploading it while preserving the local checkout. |


## 2026-10-13 · Home navigation, tutor layout and reading context

| # | Decision | Why |
|---|---|---|
| 46 | Home cards use their full body as a link. Semester uses a stretched native title link with course links above it; priority is one native link without a separate button. | Mouse, touch and keyboard navigation share native semantics; course rows still open their own course and links are never nested. |
| 47 | Chat reserves a right column in the shell with an animated width adjustment; under 900px it docks below the reading area. Respect reduced motion. | The notebook remains visible while talking, and a phone retains readable full-width text. |
| 48 | Theme, tutor provider/model and configurable chat shortcut live in a native Settings dialog. A shared connection store serves settings and chat; disable connection changes while a turn runs. | Removes configuration clutter from the panel/top button and retains per-provider saved models, keyboard accessibility and a stable connection per turn. |
| 49 | Replace sparse IntersectionObserver ratios with frame-batched reading-viewport measurements on scroll/resize/content reflow. Only visible selection in the current evaluation can take priority; reading gestures release it. | The old clicked node overrode context indefinitely, coarse thresholds missed movement, and tall blocks were penalized by total height. Hidden, occluded and previous-page nodes must not be context. |
| 50 | Refresh context synchronously at every request and read current stores after page actions; navigation waits for page and visible node. | Fixes stale asynchronous tool closures and the race between scrolling and sending a message. Conversation history persists, but the current-screen snapshot follows the page. |

## 2026-10-13 · Faculty source root and PDP course info

| # | Decision | Why |
|---|---|---|
| 51 | Document `../Facu/` as this computer's faculty source root, with an explicit path supplied by Alejo on other machines. Copy new originals into ignored course sources and keep provenance in processed notes. | Alejo moved the faculty library to Documents/Facu; the application must stay portable and independent of that external path. |
| 52 | Refresh only PDP's course information: current staff, presencial schedule, official passing regime, TPs and evaluation dates. Preserve the original P1 metadata and all evaluation files; create no P2 study page. | Alejo requested course data only. Metadata can appear in the calendar before a notebook is generated. The general-information pages of T01 also provide staff and modality. |
| 53 | Stop recurring classes at the last regular class (05/11), excluding P1 on 22/09. Register subsequent exams separately; leave TP delivery dates and exam times unset. Record TP0 in notes until its approval role is confirmed. | The official calendar distinguishes classes, no-class dates and exams. The regime requires two group TPs; the presentation additionally mentions TP0. Neither source gives delivery dates, rooms or the course code. |
| 51 | Cap the course info column at 360 px and let evaluations use the remaining width. Replace each evaluation card's vertical type stripe with a subtle type-tinted outline; the date tile and type label retain the stronger color. | General info needs less horizontal space, while longer evaluation descriptions benefit from it. The quieter accent keeps the type visible without a competing bar. |

## 2026-10-13 · Tutor scrolling, centered Settings and panel performance

| # | Decision | Why |
|---|---|---|
| 54 | Follow streamed chat only while the reader is within 48px of the bottom. Reading above pauses following through completion; returning to the bottom resumes it. Sending, clearing or reopening starts following again. Store intent in a ref and scroll instantly before paint. | Every streamed chunk previously restarted a smooth scroll and pulled readers away from earlier text. A scroll ref records intent without rendering on each gesture. |
| 55 | Center the native Settings dialog explicitly with fixed insets and auto margins; cap its height and scroll its contents in short windows. | Tailwind's margin reset overrides the browser's default dialog centering. Explicit geometry retains the native modal's focus containment, Escape and focus restoration. |
| 56 | Supersede decision 47's animated width adjustment: reserve the final notebook space once and animate only the panel's transform/opacity using the fast motion token. | Animated main-area padding changed line wrapping and triggered ruler/viewport measurements every frame. A single resize avoids that repeated work while retaining desktop reading space, the mobile dock and reduced motion. |

## 2026-10-14 · Proba: course info + Parcial 1

| # | Decision | Why |
|---|---|---|
| 57 | Build Proba's Parcial 1 from the class notes (1–14) as the base, rewritten to be more didactic, with 15 custom canvases (Bayes, Venn, birthdays, CDF, ECDF, regions, balance, correlation, transformations, exponential race, conditional slice, Bernoulli, Poisson, standardization, CLT). | The class notes already carry the theory; the value added is digestion, visuals and exam orientation. |
| 58 | Guide practice limited to prioritized exercises (! marks and the professor's STOP lists); every past-midterm exercise in scope gets a node. Topic 8 (Normal/TCL) is built provisionally from Clase 15 §4.3, the tables and the distributions sheet. | Alejo's choice ("los de prioridad"); item 5 of every midterm is Normal/TCL and the exam is close, so waiting for the class would leave 1/5 of the exam uncovered. |

## 2026-10-14 · Proba graphics review

| # | Decision | Why |
|---|---|---|
| 59 | Preserve course formulas, samples, supports and stable IDs; repair rendering and layout only. Local canvases share measured control/caption layout and font-measured SVG labels; canvas hosts may grow beyond their preferred height. | Fixed header deductions cropped drawings in narrow columns and phones. Full labels and readable drawing space must survive wrapped controls. |
| 60 | Read quoted pipe-delimited edge labels as one string, including conditional-probability bars. Capture graph drags on the stable SVG. | The total-probability diagram fell through the custom parser; replaced marks could release pointer capture during a drag. |
| 61 | Connect finite samples in the transformation density path, breaking only at atoms; use an instance-specific clipping ID. | A trailing space made every sample a move command, hiding the density curve. This restores the existing numeric density without changing its calculation. |

## 2026-10-14 · Proba rendering corrections after visual feedback

| # | Decision | Why |
|---|---|---|
| 62 | Replace coarse cell silhouettes with exact SVG supports for uniform disk/triangle cases; render varying density with a smooth texture clipped to the exact support. | Pixelated circular/diagonal boundaries were rendering artifacts, not properties of the distributions. The first review missed them. |
| 63 | Share screen-resolution curve/area paths with declared breakpoints. Draw transformation density laws analytically for the same existing distributions, leaving numerical CDF/readouts and samples unchanged. | Sampled rectangles made curved shading look stepped, and differentiating a coarse numeric CDF added spurious serrations. Genuine atoms and discrete jumps must remain distinct. |
| 64 | Move long annotations out of plots, stagger dense scale labels, reduce trial-marker size at narrow widths, and reflow long diagram chains when a vertical layout fits. | Clipping checks alone missed overlapping labels, marks covering each other and unreadable diagrams. Full-size visual review and label-collision checks now supplement the ruler test. |
| 65 | Diagram focus fades connection strokes, keeping node and edge text at full opacity. | Fading whole groups made unselected labels almost invisible, which looked like missing content during hover. |
| 66 | On phones, diagram surfaces use the viewport width with theme-based gutters, measured from their stable parent. | The notebook writing column was too narrow for readable branching diagrams. The wider surface allows the same nodes/edges to reflow without clipping branches or shrinking their labels. |
| 67 | Allow fully open solutions to show overflow, with `min-width: 0` on their grid item; compact diagram spacing before resorting to scrolling. Graphics QA checks clipping by ancestors as well as by each SVG. | An expanded solution still clipped a wider mobile tree, despite the SVG's own bounds passing. The grid must keep its writing-column width when overflow is visible. Closed solutions retain clipping and inert content. |

## 2026-10-14 · Notebook and tutor spacing

| # | Decision | Why |
|---|---|---|
| 68 | Let chat use the spare desk width before shrinking the notebook, within its existing 320–460px bounds. Keep a 12px gap to the sheet and centralize the notebook/gutter/inset/gap dimensions in theme metrics. Use layout percentages to account for the scrollbar. | On Alejo's 1530px viewport, the old 460px panel and 28px gap narrowed the 1040px sheet to about 998px. A roughly 434px panel and 12px gap fit the full sheet. Narrower screens still resize once or use the existing bottom dock. |
| 69 | Move the existing ruled/grid paper choice into Settings, visible when a notebook is open; retain the same per-evaluation persistence key and content default. Reuse the Settings appearance buttons and remove the notebook's paper toolbar. | Alejo asked to move this preference out of the reading area. Existing saved choices continue to work and changing the preference updates the open sheet immediately. |

## 2026-10-14 · Pencil notes reserve space

| # | Decision | Why |
|---|---|---|
| 70 | Place pencil notes in a wrapping heading row, using intrinsic heading width and normal-flow note height. If the pair does not fit, the note occupies its own row before the full-width body. Remove the arrow and rotation; retain red handwriting, math-label rendering and ruler alignment. Show notes on phones as well. | Alejo supplied overlaps with a table, display formula and two-column text. Reserving space prevents those body blocks from covering or being covered by a note, without narrowing them. The arrow had no specific target. Alejo will perform the visual/overlap reviews; tests and browser checks were intentionally skipped for this change. |

## 2026-10-14 · Selection menu and source tracing

| # | Decision | Why |
|---|---|---|
| 71 | Selecting notebook text opens a floating menu whose buttons are a registry (`llm/selection/actions/`): Explain and Source first. Requests reach the chat through `askTutor()` (one pending slot), shown as a quote + short question; the model receives the instruction, node id/title and the text. | Alejo asked for a popover with these two actions. A registry keeps future ones (quiz me, save a note) to one file; the bridge lets any part of the app ask the tutor without coupling to the chat component. |
| 72 | Formulas in a selection are sent as LaTeX from KaTeX's MathML annotation; selections that cut a formula expand to include it. | Copying rendered KaTeX produces duplicated glyph text the model can't read reliably. |
| 73 | Blocks declare `interactive: true` (canvas, graph2d, graph3d, slider, toggle, input) and render `data-interactive`, which disables text selection there (inputs stay editable); buttons, tabs and the margin checklist are unselectable too. | Alejo: selecting text inside interactive things got in the way of using them. A registry flag instead of a list of class names, so new blocks opt in where they are defined. |
| 74 | Source tracing uses a read-only `/api/sources` route over the existing extracted text (page-ranked term search, no index) plus two tutor tools, `searchSources` and `readSourcePage`. Citations are `[[source:ref|page]]` chips (a small chip registry) that open the original file in a new tab, at the page for PDFs. | The build-course skill already extracts page-marked text, so the tutor can verify a quote against the real page instead of only repeating node metadata. Alejo wanted the PDF opened from a small clickable reference the model writes in chat. |
| 75 | Node sources in the tutor context include their ref ids. | The tools and chips need refs; titles alone are ambiguous. |

## 2026-10-14 · Highlighter selection

| # | Decision | Why |
|---|---|---|
| 76 | Replace the browser's text selection on the notebook (mouse/pen) with Corta's own: a DOM Range kept by `core/highlighter`, painted as marker strokes in an SVG over the flow. Touch screens keep the native selection. | Edge's mini menu appears on any native selection and pages can't turn it off. Without a native selection it never appears, and the selection can look like a highlighter (Alejo approved the prototype). Recreating phone selection handles well isn't worth it, and Edge's menu doesn't show there. |
| 77 | One stroke per visual line, covering the letters (≈0.8 of the text height), split only at real gaps (columns), never inside a table row; formulas are atoms (inked box = union of KaTeX's rendered parts). | "Prolijo y continuo": inline math, code and bold must not break the ink; a display formula's own box spans the column. |
| 78 | Copy (Ctrl/⌘+C) uses the tutor's text (formulas as LaTeX); Ctrl/⌘+A selects the whole sheet; marker color is a setting with per-theme tokens and a multiply/screen blend. | Keeps copy working without a native selection and gives math a useful plain-text form. Screen blending keeps the ink visible on dark paper. |

## 2026-10-14 · Chat images and camera calibration

| # | Decision | Why |
|---|---|---|
| 79 | Images are a provider-neutral `image` content block (base64 JPEG, ≤3 per message, downsized to 1600px, quality 0.88); adapters translate to `image_url` / Anthropic `source`. They stay in the in-memory conversation only. | Alejo wants to show a paper sheet through the webcam. Keeping them in history lets follow-up questions refer to them; not persisting avoids storing photos in the DB. |
| 80 | No vision-capability table: always send, and map a provider rejection (400/404/415/422 + image/media body) to `images_unsupported`, forwarded over SSE as `{type:"error", message, code}` and shown in chat. Upstream bodies are never forwarded. | Alejo: DeepSeek may already see images, so hard-blocking by model could be wrong. A table would go stale; the provider is the source of truth. OpenCode Go support is unverified (probe blocked by network allowlist). |
| 81 | Camera calibration is a dialog (shared `ui/Modal`, native `<dialog>`, children mounted only while open) reached from Settings; capture is a second dialog (camera → preview → confirm). | Alejo asked for a dialog instead of a screen. Unmounting on close releases the webcam stream. |
| 82 | Image pipeline in one WebGL shader: flip → perspective → crop → brightness/contrast/saturation, with `preserveDrawingBuffer` for capture. Pure `geometry.ts`/`pipeline.ts` hold the maths and sizes. Corners are stored on the flipped frame, the crop on the straightened sheet. | Real-time preview with live sliders needs the GPU; separating pure maths keeps it unit-testable and each editor works in a stable coordinate frame. |
| 83 | Perspective uses 4 draggable corners; sheet proportions are `auto` (Zhang & He 2007 from the quad, falling back to edge lengths if the recovered focal is implausible) or fixed A4/Letter. | Alejo chose 4 corners. A trapezoid alone can't tell the sheet's true aspect; the estimate avoids stretched text. |
| 84 | Pasted images count only when the clipboard has no `text/plain`. | Copying from a web page puts both text and an image on the clipboard; the text is what the user meant. |
| 85 | Global shortcut and Escape are ignored while any `dialog[open]` exists. | The tutor shortcut and panel Escape fired behind the new dialogs. |
| 86 | `settings.setDebounced` / `flush` for slider-driven settings (350 ms, flushed on dialog close). | Dragging a slider would otherwise write the setting on every frame. |
| 87 | New theme tokens `stage` / `stage-ink` for video surfaces (dark in both themes). | Camera previews need a fixed dark backdrop independent of the paper theme. |
| 88 | Chat composer is a grid (`auto minmax(0,1fr) auto`, `align-items:center`). | Fixes the send button sitting low next to the textarea; also leaves room for the attach/camera buttons. |
| 89 | Never keep two files in one folder whose names differ only by case or extension-less case (`attachments.ts` vs `Attachments.tsx`). The chat bar component is `AttachmentBar.tsx`. | Windows resolves `./Attachments` to the wrong file (case-insensitive), breaking the app with a missing-export error; Linux tests don't catch it. |

## 2026-10-15 · Incremental course material intake

| # | Decision | Why |
|---|---|---|
| 90 | Add project-local `skills/course-material-intake/`: preserve/register new originals, normalize with durable locators, summarize per source, review coverage independently and propose exact changes before explicit approval. Modify only the active semester and approved items; reuse `build-course` for an approved missing notebook. | New recordings may add small exam-relevant details or explicit exclusions. Alejo needs repeatable intake and control over course changes, including when an evaluation has calendar metadata but no notebook yet. |
| 91 | Keep incremental summaries and run review/approval history under `processed/material-intake/`, linked by source ID; keep extraction under `processed/text/` and originals immutable under `sources/`. Preserve canonical video ID casing and detect collisions. Editorial Markdown does not imply tutor search support; current source tools consume compatible `.txt` extraction. | Prevents subsequent classes from overwriting prior evidence, separates proposed/applied coverage and preserves traceability without adding course-specific app code. |

## 2026-10-15 · PDP P1 transcript review

| # | Decision | Why |
|---|---|---|
| 92 | Apply transcript-backed changes to the active PDP P1 notebook only. Treat the teacher's broad oral scope statement as potential exam coverage, retain explicit exclusions (strong/weak typing definition and Visitor), preserve existing IDs and mark Visitor material historical. Keep TP requirements and examples from becoming exam predictions; do not modify P2 course content in this pass. | The teacher says anything taught can enter, while naming exceptions. The channel adds small but useful P1 concepts and caveats. Alejo explicitly deferred P2 updates, so its sources and recommendations remain available for a later pass without changing that course. |
| 90 | `SvgMathLabel` sets the label's own `font` on its `foreignObject`. | The box inherited the page's 17px/30px, whose line strut pushed 11.5px edge-chip labels ~11px below the chip's centre (node labels were fine because `.gv-node` sets a font). Fixing the component covers every SVG math label, not just diagram chips. |

## 2026-10-19 · Reading position

| # | Decision | Why |
|---|---|---|
| 93 | Each evaluation page saves the reader's position as a node anchor (`{ id, offset }`: innermost node under the reading line + px offset) in the settings table, key `reading:<evaluation key>`, and restores it on open. Per evaluation, so every course resumes on its own. | Alejo wants to reload or visit another screen and pick up where he left off, in every course. A raw scrollY breaks with lazy topics, ruler snapping and window size; stable node ids (rule 3) survive all of them. SQLite settings already persist per-evaluation choices (paper), so no new table. |
| 94 | Restore mounts the anchor's topic and those above it, then corrects the scroll each frame until the node is steady for 8 frames (6 s cap); wheel/touch/key/click cancels it. Saving is armed only after that. | Placeholders above are estimated heights; mounting them first and re-aiming absorbs late layout (fonts, KaTeX, ruler). Never saving before the restore stops the initial top from erasing the saved spot. |
| 95 | Saves happen 250 ms after scrolling stops, on `pagehide`/hidden, and when the notebook unmounts (in a layout-effect cleanup, while rects are still real). `settings.set` PUTs use `keepalive`. `history.scrollRestoration = "manual"` while a notebook is open. | Debounce avoids a write per frame; the other triggers catch a reload or navigation right after scrolling. keepalive lets the last PUT survive unload. The browser's own restore would fight ours on reload. |
| 96 | The notebook clears `scrollTarget` when it unmounts. | The overview/tutor request was never cleared, so returning to a page replayed the last click instead of resuming the reading position. |
| 97 | TP2 of TDA is a notebook under the existing calendar entry `tp2-entrega` (kind `submission`), not a new `assignment` entry. Node ids use the `tda/tp2/` prefix. | A second evaluation for the same TP would duplicate its calendar event and priority entry; the study page only needs `evaluations/<id>/evaluation.yaml`. |
| 98 | An assignment page presents the readable requirements as checkable `procedure` nodes (one per "se pide" item) with relations to the course theory, and contains **no solutions**. | Assignments are graded group work; the platform helps plan and review them, never answers them. |
| 99 | When an assignment PDF carries hidden text, the page is built from a reading copy only. The hidden passages are summarized (id, page, what they add), never transcribed; the exact inventory stays as an untrusted source in `sources.yaml`. | Verbatim imperative text in notebook content would reach the tutor as context and could be mistaken for requirements. The original PDF is kept as evidence but its text is not extracted. |

## 2026-10-19 · Google Calendar local setup

| # | Decision | Why |
|---|---|---|
| 100 | Existing Web OAuth clients use the same server-only Google environment variables as Desktop clients, with an explicitly registered `http://localhost:<CORTA_PORT>/api/gcal/callback`. Ignore `.codex-attachments/` alongside `.env`. | Alejo supplied a Web client JSON for the local calendar integration. Document its exact redirect requirement and keep uploaded credential files out of version control. |

## 2026-10-19 · Tutor width at different zoom levels

| # | Decision | Why |
|---|---|---|
| 101 | Desktop chat fills the space beside the full-width notebook, clamped to 320–760px in theme metrics. Remove the 32vw restriction and 460px ceiling; keep the existing mobile dock and notebook reservation. | At 100% zoom the old ceiling left a large unused gap and cramped tutor answers. Available CSS width responds naturally to browser zoom while preserving the comfortable 125% layout. |

## 2026-10-20 · Referenciar in the selection menu

| # | Decision | Why |
|---|---|---|
| 102 | The selection menu gets a third button, **Referenciar**, that sends nothing: it opens the chat and pins the selection as a removable quote above the input (`chat-bridge.referenceTutor`, `ReferenceBar`); the reader's next message carries it as a quote bubble plus the passage and node for the model. Sending needs the reader's own text (or an image). | Alejo wanted to highlight something and ask whatever he likes about it, not pick a canned question. |
| 103 | Selection actions now own their behavior (`run(selection, t)`); `defineAskAction` keeps the one-file "ask the tutor" shape of Explicar/Fuente. | A reference action doesn't fit "prompt + ask text"; the menu stays a plain loop with no per-type branching (registry rule). |

## 2026-10-20 · External transcription trial

| # | Decision | Why |
|---|---|---|
| 104 | Do not adopt TranscribeFlow as an intake fallback after the initial Spanish TDA trial. Preserve the selected video list, exported sample and comparison in local processed material. | Upload and SRT export succeeded for ten minutes, but technical terms and ordinary phrases were repeatedly corrupted. No full-class, batch or unlimited-capacity claim was verified. |
| 105 | Use YouTube automatic captions in the original language as the primary extraction method in `course-material-intake`; retain raw tracks, timestamps and ASR uncertainty. Creator captions and authorized local/external transcription resolve gaps or inadequate passages. | Alejo explicitly selected this default after the TDA service trial. Automatic captions are usable source evidence but do not establish human-verified accuracy. |
| 106 | Treat Buchwald's TDA videos as supplementary subject evidence for the active Podberezski course, comparing against its own official sources; keep the channel intake incremental with exact IDs and explicit caption gaps. | Alejo requested topic condensation from another chair while both courses continue. Neither external exam policies nor a temporary absence of a video determines our scope; PL is in our later calendar although outside current P1/P2 modules. |

## 2026-10-20 · One clean main for daily Git use

| # | Decision | Why |
|---|---|---|
| 107 | Align local `main` with the public history after a verified external history/working-change backup and a clean export based on remote `main`. Preserve personal files on disk with a mixed reset, untracked and ignored; remove the redundant local `publish` branch and configure `main` to track `origin/main`. Never force-push private history. | Alejo explicitly authorized one local main and ordinary add/commit/push updates without publishing courses, originals, credentials or state. Ignore rules alone do not exclude previously tracked files or their history. |

## 2026-10-20 · Approved TDA subject clarifications

| # | Decision | Why |
|---|---|---|
| 108 | Apply approved intake items R01–R04 within the existing PD and exhaustive-search nodes: counting/decision, reconstruction and memory dependencies, copying the saved best candidate, and optional MRV/domain restoration. Preserve IDs and cite exact video passages as supplementary evidence. | Alejo approved all four concrete items after independent comparison with the local guides and sources. These changes clarify existing material without importing another chair's requirements or solving assignments. |

## 2026-10-21 · Learned-node shape

| # | Decision | Why |
|---|---|---|
| 110 | Replace the learned wash + margin bracket with one closed outline per outermost learned node: a tab wrapping its checkbox continuing as a full-bleed band, drawn counter-clockwise as one path used for both the fill and the green ink loop. Every radius (tab corners, band corners, concave joins) is the checkbox radius plus the gap to the tab edge, so the shape is concentric with the checkbox and follows its size. Tall first lines (headings) with room get a headroom "ear" so the loop never cuts through the heading. Geometry is a pure, unit-tested function (`core/learned-shape/geometry.ts`); the SVG layers and animations live in `layer.ts`. | Alejo's redesign (`docs/learned-shape-port.md`): a clearer, more intentional learned state that still highlights without fading. Deriving everything from the rule unit and checkbox size keeps it correct when either changes. |
| 111 | Checkbox columns are derived (`x = frame border − 6 − gap − cb/2 − (2 − min(depth, 2)) × step`, step 14 / 9 on phones) so deeper nodes sit closer to the frame; the fixed column lists in the theme metrics are gone (`checkStep`, `checkboxRadius` replace them; `--cb-radius` keeps the CSS in sync). | The tab has to reach the frame border from every depth without crossing neighbours. |
| 112 | The shape animates only on the user's own toggles (checkbox pop, ink drawn on from the tab, fill wiped out from it; reversed in 300 ms on uncheck; a parent's shape enters while its learned children's leave). Never on page load or when lazy topics mount (the progress store counts user changes in `userSeq`; loads and rollbacks don't bump it), and none under `prefers-reduced-motion` (the shape still shows). | Reloading a studied page must not replay a celebration; motion is feedback for an action. |
