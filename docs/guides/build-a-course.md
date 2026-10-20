# Build a course

Courses are data: YAML written by the **build-course skill** (`skills/build-course/SKILL.md`), validated by
`npm run validate`, rendered by the app. You (or an agent) never write app code for a course.

## 1. Put the material in place

On Alejo's current computer, the original faculty material is in the sibling `../Facu/` folder;
PDP is in `../Facu/PDP/`. This location is machine-specific: on another computer Alejo will specify
the root. Read [local-materials.md](local-materials.md) before importing. A course-info-only run
updates metadata and calendar entries without generating or modifying evaluation notebooks.

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

For a new class recording, transcript, PDF or other incremental material, use
[`course-material-intake`](../../skills/course-material-intake/SKILL.md). It selects only the active semester,
preserves/registers sources, saves one cited Markdown summary per source and compares it with existing content
and official scope. It presents concrete proposed changes before asking approval; notebook and course metadata
updates begin only after that approval. Its intake manifest, summaries and review/approval history live under
`<course>/processed/material-intake/`. Extracted text remains under `processed/text/`; the tutor currently reads
compatible `.txt` extraction, not editorial `.md` summaries. See the skill for timestamp and page handling.

For YouTube intake, the primary extraction method is YouTube's automatic captions in the recording's
original language. Preserve raw tracks and timestamps, label ASR uncertainty and verify decisive claims.
Use creator captions or authorized local/external transcription to resolve missing or inadequate passages.

Transcription-service trial (2026-10-20): TranscribeFlow returned a ten-minute Spanish TDA sample
and an SRT export, but repeatedly corrupted technical terms. It is not a validated fallback for the
intake skill. The local trial evidence and channel selection are in TDA's
`processed/material-intake/transcribeflow-test-2026-10-20/`. A successful upload/export does not establish
transcription quality, unlimited capacity or batch reliability; compare against source evidence before adoption.

When using classes from another chair, compare subject matter with the student's own current syllabus,
schedule, guides and notebooks. Keep that chair's administration, grading, deadlines and TP requirements
out of course updates. Distinguish topics outside the current exam from later topics of the same course.
For an ongoing channel, record the retrieval date, selected IDs, last processed video and unresolved tracks
in the course's `processed/material-intake/index.md`; later intakes extend that record and recheck gaps.

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
# Mathematical notation

Use explicit `$TeX$` in mathematical titles, notes, controls and graphic labels, including diagrams.
Quote diagram labels and keep formulas whole across line breaks. Canvas modules use the graphics
kit's math components. Preserve programming identifiers as literal text. See [math-labels.md](math-labels.md).

