# Local university source material

On Alejo's current Windows computer, the faculty material lives in:

```text
C:\Users\alejo\OneDrive\Documents\Facu\
  PDP\
    Calendario _ Paradigmas de programación - FIUBA.pdf
    Régimen de cursada _ Paradigmas de programación - FIUBA.html
    Parcial 1\
    Parcial 2\
  ...other courses...
```

From this Corta checkout, the root is `../Facu/` (a sibling folder in Documents).
The PDP material is `../Facu/PDP/`. Use this root for new imports; historical inventories
may still mention `../PDP/`, which describes their earlier import location.

This is a **machine-specific source location**, not an application dependency or a portable
default. On another computer, Alejo will specify the corresponding location. Confirm that
root before importing material; do not assume his Windows path exists, hardcode it in the
app or rewrite existing imports to point at an unavailable external folder.

Treat this material as read-only. Import by copying new originals into the course's local
`content/semesters/<semester>/courses/<course>/sources/` and registering them in `sources.yaml`.
Never move, overwrite or edit the originals or previously imported sources. Keep extracted
text, provenance, ambiguities and coverage in `processed/`. The application uses the local
course files; it does not need access to Facu at runtime. Course data and imported files
remain ignored by Git, as explained in [public distribution](publish-empty-app.md).

For a **course info only** request, update `course.yaml`, the source registry and the matching
audit. Calendar entries may describe future exams without creating their study pages. Do not
generate or change `evaluations/**` outside Alejo's requested scope. Preserve existing IDs and
record missing dates, rooms and other facts instead of inferring them.

PDP's 2026-C2 intake on 2026-10-13 used the saved calendar, regime and the general-information
pages of the presentation PDF found under Parcial 2. Its detailed provenance lives locally in
`content/semesters/2026-C2/courses/pdp/processed/course-info.md`. The existing Parcial 1 files
were preserved and no Parcial 2 notebook was generated.
