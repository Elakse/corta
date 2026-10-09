# Build a course

Courses are data: YAML written by the **build-course skill** (`skills/build-course/SKILL.md`), validated by
`npm run validate`, rendered by the app. You (or an agent) never write app code for a course.

## 1. Put the material in place

```text
content/semesters/<semester>/courses/<course-id>/sources/
  syllabus/  bibliography/  classes/  guides/  midterms/  finals/  assignments/  other/
```

Copy files in (never move or edit originals elsewhere). `sources/` is read-only from then on.

## 2. Run the skill with a scope

Ask your agent (Claude Code, Codex…) from the repo root, e.g.:

> Use `skills/build-course/SKILL.md` to build `content/semesters/2026-C2/courses/pdp` with scope
> **"course info + Parcial 1"**.

The skill inventories and extracts text (`npm run extract -- <course>/sources`), classifies sources into
`sources.yaml`, reconstructs `course.yaml` (schedule, evaluations, staff…), decides what's evaluated, writes the
topics, links every node to its sources and audits coverage in `processed/coverage.md`.

Later runs grow the course piece by piece: "Parcial 2", "TP 1", "Final". IDs are reused, progress survives.

## 3. Check

```powershell
npm run validate
npm run coverage -- content/semesters/2026-C2/courses/pdp
npm run ruler
```

Then `npm run dev` and open the evaluation page from Home → semester → course.

## 4. Things to know

- New blocks the content needs: `docs/guides/add-a-block.md`, then `npm run catalog` so the skill can use them.
- The skill writes questions it couldn't answer from the material to `processed/notes.md`.
- Sample to imitate: `content/semesters/_sample/` (it's marked `sample: true` and hidden from Home once a real semester exists).
