# Study Platform — Design Overview

> Working document. Captures what has been decided so far about the idea. Not a final spec.
> Reorganized from `archive/plataforma_estudio_estado_actual.md` (same content, deduplicated and regrouped).
> **Implementation details (content model, stack, structure, patterns, roadmap) live in `architecture.md`.**

## Contents

1. [Vision](#1-vision)
2. [Design principles](#2-design-principles)
3. [Architecture: four connected systems](#3-architecture-four-connected-systems)
4. [Academic system — *what exists*](#4-academic-system--what-exists)
5. [Representation system — *how it's explained*](#5-representation-system--how-its-explained)
6. [State system — *what's happening with the user*](#6-state-system--whats-happening-with-the-user)
7. [Agent context system — *how an LLM understands it*](#7-agent-context-system--how-an-llm-understands-it)
8. [Screens](#8-screens)
9. [Content generation skill](#9-content-generation-skill)
10. [Sources, storage and updates](#10-sources-storage-and-updates)
11. [Decisions](#11-decisions)
12. [Open questions](#12-open-questions)

---

## 1. Vision

A **personal web app for studying university courses**, built around each course's real material (syllabus, slides, guides, past exams, assignments, schedules, repos…).

It's not a course tracker or a notes folder. It's a **study engine**: it models a semester, its courses, exams, topics, concepts, exercises, bibliography, classes, dates and progress — and turns messy course material into a complete, auditable study experience.

**The goal of generated content** is not a generic study guide. It's to reconstruct, as faithfully as possible:

- what the teaching staff expects students to learn, and what really matters;
- how topics relate and how they're evaluated;
- what's required to pass, and what material backs each part;
- what to study to arrive prepared for each evaluation.

> **Core objective:** maximize coverage of everything needed to pass the course, while staying faithful to the staff's terminology, notation, depth, priorities and way of evaluating.

---

## 2. Design principles

| # | Principle | Meaning |
|---|---|---|
| 1 | **Faithful to the course** | Keep the staff's terminology, notation (same letters, symbols, naming) and emphasis. |
| 2 | **Coverage** | Nothing needed to pass gets lost during generation. |
| 3 | **Traceability** | Any piece of info can be traced back to its source. |
| 4 | **Consistent academic structure** | Courses differ, but share a common vocabulary. |
| 5 | **Flexible representations** | One academic element can be explained in many ways. |
| 6 | **Rich visualization** | Visualize concepts whenever it helps. |
| 7 | **Interactivity** | Visualizations let you play with variables, parameters and states. |
| 8 | **Everything is connected** | Calendar, courses, classes, exams, progress and planning are one model, not separate systems. |
| 9 | **Data before pages** | The UI renders a structured model; info never lives only in HTML. |
| 10 | **LLM-ready from day one** | Even before full integration, the architecture must be understandable and manipulable by an agent. |
| 11 | **Hierarchical progress** | Learning state exists at every relevant level. |
| 12 | **Incremental updates** | The app evolves during the semester without rebuilding from scratch. |
| 13 | **Extensible by design** | Every catalog (primitives, components, features) can grow without breaking existing parts. |
| 14 | **Interactive composition** | Components share state and react to each other to build coordinated explanations. |

**The guiding formula:** *rigid academic structure + very flexible content representation.*
This avoids both extremes: a free-form structure that becomes unmaintainable, and a rigid one that can't adapt to different courses. Subjects don't invent their own UI — they compose elements from a shared, high-level domain language built for study pages.

---

## 3. Architecture: four connected systems

| System | Answers | Contains |
|---|---|---|
| **Academic** | *What exists?* | Semester → Course → Evaluation → Topic → Concept → properties / theorems / methods / exercises |
| **Representation** | *How is it explained?* | Text, LaTeX, code, tables, images, diagrams, charts, simulations, 3D, quizzes… |
| **State** | *What's happening with the user?* | Progress, completion %, selection, planning, study time, priorities, calendar |
| **Agent context** | *How does an LLM understand and act on it?* | IDs, metadata, relations, sources, current/visible/selected element, available actions |

### Extensibility — a core requirement

No catalog is closed. It must be possible to add new **academic primitives, representation blocks, visualizations, chart types, interactive exercises, tools, agent actions, evaluation systems, sources, integrations and metadata types** without redesigning the core.

Each new component plugs in through a **common contract** that defines:

- what data it receives and what it renders;
- what state it holds;
- what events it emits and what actions it accepts;
- how other components or an agent can interpret it.

No course-specific logic is hardcoded. When a course needs something new, the system's vocabulary grows. **It's a platform, not a fixed set of pages.**

---

## 4. Academic system — *what exists*

### Hierarchy

**Semester → Course → Evaluations / requirements → Topics → Study content**

- **Semester** is the top-level unit (e.g. *2026 — 1st semester*, *2026 — 2nd semester*…). Each one is an independent workspace containing that period's courses. New semesters can be added without redesign.
- Courses pick only the evaluation elements they need — some have no final, one or many midterms, zero or several assignments, or special promotion rules. No arbitrary per-course structure.

### Primitives (initial, list will evolve)

These become open `kind` labels on nodes, not special components (see `architecture.md` §2).

| Group | Elements |
|---|---|
| Structure | Semester, Course, Topic, Subtopic, Class |
| Evaluation | Midterm, Retake, Final, Assignment (TP), Submission, Passing requirement |
| Knowledge | Concept, Definition, Property, Remark, Theorem, Proof, Formula, Method, Procedure |
| Practice | Example, Exercise (from source material, with hidden solution) |
| Sources | Resource, Source, Bibliography |
| Relations | Prerequisite, Concept-to-concept relation |

Elements nest inside each other, e.g.:

- Course → Midterm 1 → Topic 1 → Concept → Property → Exercise
- Course → Assignment → Goals → Requirements → Milestones → Deliverables

### Lateral relations

Besides the tree, elements link sideways. A single concept can belong to Midterm 1, reappear in Midterm 2, be a prerequisite for another concept, appear in specific exercises and be backed by several sources.

### One entity, many views

No duplicated, disconnected data. A class belongs to a course and appears on the course page, the calendar and the day panel — it's **the same entity**, not a copy. Likewise an exam date shows up in the calendar, the course, the exam page, the study plan and the "next priority" card.

---

## 5. Representation system — *how it's explained*

A single academic element can hold **several representations at once** (e.g. a property with text, a formula, a proof, an image, an interactive diagram, examples and exercises).

### Blocks

| Group | Blocks |
|---|---|
| Text & math | Rich text, LaTeX, formulas, tables, comparisons |
| Media & sources | Images, referenced PDFs or fragments |
| Code | Code, code execution where it makes sense |
| Visuals | Diagrams, charts, 2D, 3D, simulations, animations, timelines, trees, graphs |
| Practice | Quizzes, interactive exercises |
| Custom | Concept-specific interfaces when needed |

### Visualizations have a lot of freedom

Not limited to predefined chart types. A visualization can include sliders, buttons, toggles, draggable points, editable variables, animations, transformations, simulations, states, combined charts, 3D scenes and step-by-step algorithm execution.

### Components talk to each other

Components aren't isolated units. On the same page they can **expose state, receive inputs and emit events** through a common mechanism, so an explanation becomes a coordinated experience rather than a stack of static blocks.

Examples: editing code updates a chart · running an algorithm steps through a visualization · a slider updates a formula, a chart and a 3D scene at once · selecting a point highlights it in another chart · a toggle shows/hides info across several elements · a simulation feeds a table · an exercise reveals its solution in a visualization · selecting part of a diagram changes the explanatory text.

```text
Code ────────────┐
                 ↓
Slider ─────→ Shared state ─────→ Chart
                 ├──────────────→ Formula
                 └──────────────→ 3D diagram
```

The system's language should express bindings roughly like:

```text
when simulation.angle changes   → update vectorDiagram.angle
when codeEditor.output changes  → update performanceGraph.dataset
when showForces = true          → forceDiagram.showVectors = true
                                → explanation.show("forces")
```

Implementation is undecided, but conceptually it's a **reactive system of state, events and bindings**. Bonus: the LLM can understand not only which components exist, but how they're linked and what changing each one would do.

---

## 6. State system — *what's happening with the user*

### Hierarchical progress

- Every relevant academic element can be marked as **learned/completed** with a checkbox in the page margin. Every piece of content belongs to some checkable element, so the page is a complete checklist.
- Marking a parent marks all descendants (topic → concepts, properties, theorems, exercises…). Marking a child marks only that child and what's inside it. Unmarking a child makes the parent partial (shown with a dash).
- Learned content is **highlighted, not faded**: a soft highlighter wash plus a margin bar from the checkbox, so it stays easy to review.
- So every node has a **progress %** (e.g. *Topic 2 — 73%*), which propagates to: exam overview, exam / course / semester progress, calendar, planning, next-priority recommendation and LLM context.
- Progress is part of the **core data model**, not just a checkbox's visual state.

### Study planning

- The user plans sessions (e.g. *Mon: 2h Midterm 1 of course X, 1h assignment; Tue: 3h another midterm; Wed: review topic Y*). Sessions appear in the calendar.
- Later, the system could help build the plan from exam dates, pending content, size estimates, progress, priority and available hours. *How much is manual vs. automatic is still open.*

---

## 7. Agent context system — *how an LLM understands it*

Designed from the start for deep LLM integration. The model must **not** depend on reading or visually interpreting the DOM; there's a structured representation of the page instead.

**Every important element has:** stable ID · semantic type · relations · content · sources · progress state · metadata · position in the academic structure.

**The system tells the model what the user is looking at:** current semester, open course, open exam, visible topic, selected concept, active exercise, selected chart, current simulation values, current page, and the element the user is asking about.

### Contextual chat side panel

The user can ask things like *"I don't get this"*, *"Why does this happen?"*, *"Explain it geometrically"*, *"Show me another example"*, *"What happens if I increase λ?"*, *"Make a chart for this"*, *"Where does this formula come from?"*, *"What do I need to know first?"* — and the model knows immediately what "this" is.

### Future: the model acts on the UI

Create or modify a visualization · change parameters · generate an alternative explanation · show a comparison · temporarily insert a chart · navigate to a source or related concept.

---

## 8. Screens

### Home

```text
┌───────────────────────┬───────────────────────┐
│   Current semester    │    Next priority      │  ~1/3 height
├───────────────────────┴───────────────────────┤
│                                               │
│               Large calendar                  │  ~2/3 height
│                                               │
└───────────────────────────────────────────────┘
```

- **Current semester card (left):** summary of the active semester; click to open its full page.
- **Next priority card (right):** what's probably best to do next — study for an upcoming exam, advance an assignment, prepare a submission, finish or review a topic. Likely based on deadlines, exam proximity, progress, remaining content size, academic importance and the study plan. *E.g. an assignment due in 4 days with lots left would show up here.* Exact criteria TBD.
- **Calendar — one of the most important elements of the app.** Large, polished and fully interactive: navigate months/weeks, select and inspect days, distinguish event types, jump to key dates. Contains exams, retakes, finals, submissions, assignments, classes, schedules, relevant holidays and planned study sessions.

### Day panel

Clicking a day opens a **side panel** with everything for that day. Every item links to its original entity.

| Item | Shows |
|---|---|
| Class | Course, time, duration, in-person/virtual, room, campus, link, professor, related info |
| Study session | Course, exam, topic, planned duration, goal |
| Submission | Related assignment, deadline, status, shortcut |
| Exam | Course, time, location, content, shortcut to its study page |

### Semester page

The semester's courses as **large cards in a Masonry layout**, sized by how much relevant info they show. Click to enter a course.

### Course page

1. **General info:** name, code, teaching staff, professors, contacts, rooms, campuses, class days and times, modality, official links, campus portal, repos, schedule, bibliography, admin info. Time-related info syncs with the calendar.
2. **What it takes to pass:** the course's evaluation elements (Midterm 1, Midterm 2, Retake, Assignment, Final assignment, Final…), only the ones that apply.

On wide screens, the evaluation list takes the flexible main column; general info stays in a narrow column (up to 360 px). Evaluation cards show their type color in the date tile, kind label and a subtle outline, without a vertical color stripe. On narrower screens, general info moves below the evaluations.

### Evaluation page (e.g. a midterm)

Takes the full screen; a **long continuous scroll** containing everything needed to study it (performance handled with progressive rendering / virtualization if needed).

**It looks like a real notebook page:** an endless spiral-notebook sheet, ruled or grid paper, a printed header box with course, evaluation, topic, date and progress, text sitting exactly on the lines, graphs "taped" on, hidden solutions under a handwritten toggle, and the checklist in the margin. Details in `architecture.md` §6; working reference in `../prototypes/notebook-page/notebook.html`.

```text
Midterm 1
├─ Topic A → Concept A1 → Definition, Properties, Theorem, Visualization, Examples, Exercises
├─ Topic B → Concepts, Methods, Exercises
└─ Topic C → …
```

Ordered **pedagogically**, not in the order documents were found.

**Bird's-eye view at the top** — a visual overview to quickly see how many topics there are, what each contains, which are big or small, what depends on what, what's nested where, how much is left and what's done. Same data, switchable views:

| View | Best for |
|---|---|
| **Treemap** | Relative size/weight of each topic (like disk-usage maps) |
| **Graph** | Dependencies (Concept A → Concept B → Theorem C) |
| **Hierarchy / tree** | Containment (Topic → Concepts → Theorems → Exercises) |

Every overview element is navigation: clicking "Topic 3" scrolls to it.

---

## 9. Content generation skill

A skill analyzes all available material and **builds or updates a course**. It doesn't read files one by one and spit out a page — it does a **holistic review of the whole course corpus**, more like *compiling* a course.

### Pipeline

| # | Step | What it does |
|---|---|---|
| 1 | **Inventory** | Find every available source. Nothing important should be accidentally ignored. |
| 2 | **Classification** | Identify what each one is: syllabus, guide, class, bibliography, exam, solution, assignment, supplementary material. |
| 3 | **Reconstruction** | Determine overall structure, schedule, requirements, evaluations, professors, classes, dates, contents. |
| 4 | **Cross-referencing** | Never trust a single document. The syllabus names a topic; classes show the depth; guides show expected skills; past exams show what's really tested. |
| 5 | **Identify what's evaluated** ⭐ | One of the most important steps: what must be known, understood, proven, calculated, implemented, solved or recognized to pass. |
| 6 | **Decomposition** | Turn it into the academic structure (Exam → Topic → Concept → Property → Theorem → Method → Exercise). |
| 7 | **Relevance** | Weigh items by presence and frequency in exams, number of exercises, syllabus and class emphasis, dependencies, difficulty, prerequisite importance. Also feeds the exam overview visuals. |
| 8 | **Pedagogical order** | Order for learning, respecting prerequisites — not document order. |
| 9 | **Content generation** | Build the study experience using the available primitives (text, formulas, examples, diagrams, charts, code, visualizations, simulations, exercises). |
| 10 | **Source linking** | Every generated element keeps references to the sources backing it. |
| 11 | **Coverage audit** | A second full pass comparing all sources against the final structure: *is anything needed to pass missing or under-represented?* |

The skill's goal isn't "make good notes" — it's the **core objective** in [§1](#1-vision). This should become one of the central principles of all skills.

---

## 10. Sources, storage and updates

### Traceability

All material is provided manually by the user (see [Decisions](#11-decisions)). Sources can include: syllabus, bibliography, PDFs, slides, classes, notes, guides, exercises, assignments, past midterms and finals, schedules, repos, official pages, the campus portal and manually provided docs.

Every generated element should answer **"Where did this come from?"**, ideally distinguishing:

1. info **explicitly present** in a source;
2. **inferences** made by crossing several sources;
3. content **generated** to help study.

This keeps generated content from being mistaken for an official statement by the teaching staff.

### File structure (tentative)

Key rule: **original sources and processed content never mix.**

```text
/semesters
  /2026-C2
    /courses
      /course-a
        /sources              ← material as obtained
          /syllabus
          /bibliography
          /classes
          /guides
          /midterms
          /finals
          /assignments
          /other
        /processed            ← output of the agent's analysis
          metadata
          calendar
          evaluations
          concept-structure
          relations
          generated-content
          indexed-sources
```

### Incremental updates

A course is not a static artifact. During the semester new classes, guides, corrections, assignments, dates, announcements, material and schedule changes will appear.

- Output is stored as **structured data**, not just final HTML.
- The skill can re-run and update existing content **without destroying** progress, learned marks, annotations, planning or any user state.
- Ideally it detects what's new, what changed, what needs regenerating and which relations need updating.

---

## 11. Decisions

| Area | Decision |
|---|---|
| **Content model** | Two thin layers: **Nodes** carry meaning (ID, kind, title, sources, weight, progress) and **Blocks** are visual components (text, image, graphs, diagrams, layout…) mixed and nested freely. Academic primitives (theorem, definition…) are just open `kind` labels on nodes, not special components. See `architecture.md` §2. |
| **Freeform graphics** | Hybrid: shared design tokens + a themed graphics kit ("legos") + a free `canvas` block where the agent writes code. Consistent style, full freedom. |
| **Block interaction** | Shared named page variables (like spreadsheet cells). Blocks declare which variables they read/write. |
| **Tech stack** | Vite + React + TS, Tailwind + Framer Motion, YAML content validated with Zod, KaTeX, Shiki, Mafs, react-three-fiber, Mermaid, d3-hierarchy, Zustand, Hono + SQLite (Drizzle). Runs locally. |
| **Roadmap** | Scaffold → content core → progress → visuals / navigation / calendar → generation skill → LLM panel → priority card. See `architecture.md` §9. |
| **Build order** | 1) Foundation: website + everything underneath (data model, renderer, component contract, progress). 2) Generation skill that uses that structure to build courses. 3) Features on top. Goal: a solid base that's easy to extend. |
| **Validate early** | Test the course-building language against one real course early, so it's shaped by real material instead of guesses. |
| **Component bindings** | No custom binding language for now. Each interactive widget declares its **inputs and outputs**, and the page connects them. After ~3 real use cases, extract the general pattern. |
| **Practice** | Practice exercises are part of each course, placed at the right points in the study flow. They're **taken from the source material, not invented**. Each has a hidden worked solution. Solving one correctly marks it as learned, like any other element. The LLM chat can help on any exercise. |
| **Exercise solutions** | Solutions follow the staff's conventions (notation, steps, level of detail, style of their worked examples). If a source has no official solution, the generated one is **labeled as generated** (traceability tier 3). |
| **Stable IDs** | Every element gets a **permanent, meaning-based ID** (e.g. `algebra/midterm-1/eigenvalues/definition`), not a position number. The skill **reuses existing IDs** when updating and only creates new ones for new things. |
| **Content vs user state** | Course content (files) and user state (progress, plans, annotations) are stored **separately**, linked only by ID. Courses can be rebuilt or extended without losing progress. |
| **Source material** | The user provides all material manually. No automated gathering. |
| **Generation scope** | The user defines the scope of each run (e.g. Midterm 1 now, then Midterm 2, assignments or the final later). Courses grow piece by piece. |
| **Progress %** | Weighted by each item's size/relevance, not just a count of items done. |
| **Notebook page** | Evaluation pages are drawn as a spiral-notebook sheet (ruled or grid), built in code. Text always sits on the rules via the measuring "ruler" module, enforced by an automated test. Reference prototype in `../prototypes/notebook-page/`. |
| **Checklist** | Nested margin checkboxes: parent checks its whole subtree, child checks only its own. Learned = highlighted, never faded. |
| **Google Calendar** | **One-way sync** (app → Google) into a dedicated "Corta" calendar. Two-way sync is out of scope for now. |

---

## 12. Open questions

| Area | Still undecided |
|---|---|
| **UI / design** | Visual design of screens other than the evaluation page (notebook look decided) · card visual language · global navigation · whether there's a main sidebar · study / review / practice modes |
| **Data model** | Final list of academic primitives · final list of representation primitives · (storage decided: YAML content + SQLite state) · how personal annotations work · how progress history is represented |
| **Components & tech** | In-page code execution · graphics kit contents · which prebuilt visual blocks come after v1 |
| **Planning & priority** | "What should I do now" algorithm · how much planning is automatic · how study time is estimated · how a topic's relative size/weight is computed |
| **Content pipeline** | How relevance is computed automatically · how conflicts between sources are resolved · merge rules when updating a course (ID strategy decided) · source indexing and retrieval · how skills are organized |
| **LLM** | Which model/provider · which actions the LLM can perform |
