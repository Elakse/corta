---
name: course-material-intake
description: Incorporate new class videos, transcripts, PDFs or other course material into Corta's active semester; preserve sources, create cited Markdown summaries, review coverage and propose course updates for approval before applying them. Use for incremental material intake rather than rebuilding a course from scratch.
---

# Course material intake

Turn new material into durable evidence and a concrete update proposal. Intake, extraction and review may proceed under the user's request; **changing course, semester or evaluation content requires explicit approval of the proposed items**. A request to analyze material or invoke this skill is not that approval.

Paths below are relative to the Corta repository or the selected course. This skill works with agents that can read files and run commands; no machine-specific paths or account are required.

## Establish the target

1. Find the repository via `AGENTS.md` and `docs/INDEX.md`; inspect local changes before editing. Read `docs/content-format.md`, `docs/guides/build-a-course.md` and `skills/build-course/SKILL.md`. Use the latter's content rules after approval; its automatic gap-fixing step does not override this skill's approval gate.
2. Read `content/semesters/*/semester.yaml`. Select the unique non-sample semester with `active: true`; check its dates against the user's current local date. Never activate a semester or modify an old one to make the input fit. If activation is ambiguous or clearly stale, ask which current semester to use before any course writes. Continue inspecting the supplied material independently.
3. Identify the course from the input, current course metadata and official materials. Do not assume the most recently edited course. If ambiguous, ask one concise question before registering sources. Read its `course.yaml`, `sources.yaml`, all affected evaluation topics and `processed/` inventory, classification, course info, evaluated content, coverage and notes. Resolve any official source links needed to check scope; record retrieval dates.
4. Record the requested inputs/range and evaluation scope. For a channel or playlist, identify exact inclusive start/end video IDs and verify the count/title list; do not replace a title boundary with an approximate upload date. Upload date, class date and exam scope are distinct.

Only the active semester is eligible for updates. Material from another term can be evidence for a current course when relevant; its historical origin does not authorize edits to that term.

## Preserve and register evidence

- A material-intake request authorizes reading supplied files and downloading publicly accessible source material needed for that intake. Use existing access for restricted material only within the user's authorization. Stop at access/paywalls; request the missing file/access instead of bypassing it. Do not purchase transcription, send private files to an external service or install a paid fallback without authorization.
- Copy user files; never move or edit their original. Store new immutable originals under the course's existing `sources/<role>/` layout. Adding a new original is permitted; editing, overwriting, renaming or deleting an existing original is not. Preserve the original filename when practical; disambiguate collisions in a new folder or versioned filename.
- For YouTube, preserve the **exact case-sensitive video ID**, canonical URL, title, channel, language, duration, upload date, retrieval date and caption track ID. Prefer publisher/creator captions over automatic captions. A publisher track may still contain ASR errors. Save the raw VTT/SRT intact, e.g. `sources/classes/youtube/<ExactVideoID>.<track>.vtt`. Download audio/video only when needed for missing captions, unclear speech or essential on-screen information.
- If captions are absent, use an available authorized local transcription method; identify it and its limitations. If unavailable, save the accessible evidence and report the unresolved gap. OCR is likewise a labeled extraction fallback, not an authoritative quotation. A supplied transcript must retain its supplied provenance; do not call it a verified recording.
- Before creating anything, compare `sources.yaml`, canonical URL/video ID and file hashes. Reuse an existing source ID for identical material. Never mint two IDs for URL aliases. New editions/tracks with substantive differences get a new immutable original and an explicit relation to the prior source; do not silently replace it. Detect ID and filename collisions case-insensitively for Windows portability, including when a normalized ID drops punctuation. Preserve existing IDs; use a stable suffix to disambiguate new ones.
- Register each source once in `sources.yaml` using the current schema (`id`, course-relative `path: sources/...`, allowed `kind`, `title`, `short`). Keep detailed provenance in the intake manifest rather than inventing registry schema. Update `processed/inventory.md`, `classification.md` and `notes.md` incrementally. Do not rewrite unrelated entries or mark proposed content as already covered.

## Extract and condense

Use this layout for new intake without migrating or overwriting older working files:

```text
<course>/processed/
  text/<source-id>.md                   # normalized, locator-preserving reading copy
  material-intake/index.md              # cumulative manifest and processing status
  material-intake/summaries/<source-id>.md
  material-intake/reviews/<run-id>.md    # exact proposal + approval/application record
```

Choose a unique dated `run-id` with a suffix when necessary. The index links each source ID, original, normalized text, summary and review, with extraction method/quality, content hash, evaluation mapping and status (`extracted`, `reviewed`, `awaiting approval`, `applied`, `unresolved`). Identical reruns reuse artifacts; changed extraction or proposals record a new revision/run instead of erasing prior evidence or approval history. Existing aggregate summaries can remain linked from the index.

For PDFs, prefer the existing `npm run extract -- <course>/sources` extraction, retaining physical page boundaries. Keep printed page numbers separately if they differ. For transcripts, preserve cue timestamps, speakers where known and gaps; merge only duplicate/rolling caption fragments without deleting distinct claims. Preserve code and formulas as literal text when clear. Never reconstruct unseen code, a clipped diagram or an inaudible claim as an official solution. Verify start/end coverage against duration/pages and inspect representative technical passages; cue completeness alone does not establish accuracy.

**Tutor compatibility:** normalized Markdown is an editorial artifact. The current `server/src/sources/library.ts` reads `.txt`, first at `processed/text/<path-under-sources-without-extension>.txt`, then a unique matching basename. PDFs use `=== page N ===` markers (or form feeds). Recheck that contract if the code changes. Preserve compatible PDF extraction; for other sources, a `.txt` companion may retain timestamps and be indexed as one text segment. Such segments are not physical pages or timestamp-aware video navigation. Do not promise that `/api/sources` reads Markdown or opens a video at its cited time; cite canonical timestamp URLs and node `locator` fields instead. Do not modify the app to complete an intake task.

When delegation is available, use these two separate passes, supplying actual normalized files and context rather than only titles:

1. **Summarizer:** GPT-6 Luna, extra-high reasoning (`gpt-6-luna`, `xhigh`). Give it the material, source IDs, official schedule, known scope and summary requirements. It writes summaries, not course content.
2. **Independent reviewer:** GPT-6.1 Sol, high reasoning (`gpt-6.1-sol`, `high`). Give it summaries, normalized originals, official current-semester sources and existing course content. Require it to verify decisive claims in the normalized original and inspect audio/image/written sources when text is inadequate. It writes the review proposal only.

For tools that require a fresh context to override model/reasoning, pass a self-contained brief and file paths. Keep review independent; neither agent may apply proposed YAML changes. If delegation or a requested model is unavailable, continue sequentially with the best available model and disclose which stage differed. Do not claim an independent review when one agent performed both passes.

Each summary must preserve:

- Source identity, exact canonical URL/ID, original path, retrieval/provenance and extraction quality.
- Evaluation mapping with evidence and confidence; allow multiple evaluations, transversal/TP content and unresolved scope. Do not force every video into one partial.
- All substantive concepts, distinctions, examples, methods, exercise constraints, edge cases, corrections, caveats and small oral details that could matter; reduce repetition, not meaning. Include professor terminology and relevant code/formulas. For long material, work in chunks and reconcile them against the entire source before finishing.
- Timestamp/page citations for substantive claims, especially exam policies, exclusions and corrections. Clearly distinguish explicit teacher statements, reviewer inference and generated explanation. Mark ASR/OCR uncertainty and missing visual context.
- Separate teacher-stated exam scope, historical exam anecdotes, TP requirements and pedagogical recommendations. A statement that anything said may be examined broadens the coverage audit; it does not make every example a predicted question or cancel explicit exclusions. Preserve a missing recording as a gap even when every published video was downloaded.

## Compare and present a brief

Review the material against both current content **and** official schedule/syllabus/guides/exams; summaries alone can omit a decisive detail. Check topics and individual claims, notation, solution assumptions, exclusions and small qualifications. Verify decisive corrections/exclusions in the original evidence. Do not transfer one historical TP's dates or requirements into current metadata without corroboration. Resolve a self-correction using the final statement and record unresolved contradictions.

Write a review with an itemized proposal table:

| Item | Action | Exact file/node ID | Proposed wording or content | Source + locator | Explicit/inferred; confidence |
|---|---|---|---|---|---|

Include existing coverage, genuine omissions, incorrect claims, scope changes and justified removals. Propose changes at the smallest useful level; reuse existing nodes where possible. No invented exercises or official solutions. If material is excluded, prefer preserving existing IDs as clearly optional/historical; explain any actual removal and its effect before seeking approval.

If an evaluation has calendar metadata but no `evaluations/<id>/evaluation.yaml`, explicitly report **missing notebook**, list available official sources and propose a bounded build scope using `build-course`. Do not pretend to have compared against a notebook that does not exist or silently generate it. Record subjects not yet taught/available as unresolved; do not infer completeness from the latest video.

Give Alejo a short brief linking the saved summaries and review: target term/course, proposed additions/edits/removals, exact item IDs, major evidence, uncertainty and remaining gaps. If nothing warrants a change, say so and finish the intake record. Otherwise **ask approval for those specific items and stop before modifying `course.yaml`, `semester.yaml`, evaluation/topic YAML or course assets**. The source registry and analysis artifacts may already be saved. Mark coverage changes as proposals until applied.

## Apply the confirmed items

On explicit confirmation, re-read the proposal, active term and destination files. Apply only approved item IDs; a new conflicting source or materially changed proposal needs a revised brief. Confirmation of one course/evaluation does not authorize another. Use `build-course` and the current block catalog for any approved new notebook, with the approved scope binding.

Preserve all existing node IDs and unrelated edits. Add source refs with `basis: explicit | inferred | generated` and precise `page`/`locator` as applicable. Never edit/delete original `sources/` material, user state or inactive-semester files. Update `evaluated-content.md`, `coverage.md`, `classification.md` and `notes.md` to reflect only applied changes; retain excluded/unknown items and their evidence. Record approval, applied item IDs and resulting file paths in the run review/index.

Follow the project's current required checks for actual content changes, within the user's testing instructions, and report what ran or remains unverified. Analysis-only intake needs artifact checks (source identity, locator validity, completeness, registry paths, deduplication), not an app test run. Finish with saved artifact links, applied/proposed counts and unresolved issues. Never claim that a proposal was applied or that downloaded captions cover unrecorded classes.
