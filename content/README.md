# Local study content

This repository ships an empty study library. Add your own semesters and courses under
`content/semesters/` using [the course-building guide](../docs/guides/build-a-course.md).
Everything in this folder except this README is ignored by Git: course YAML, original sources,
processed notes, images and course-specific canvas modules stay local.

Synthetic browser/unit test content lives under `tests/fixtures/` and is loaded only when
`VITE_CORTA_TEST_CONTENT=1`. It is not shown or bundled in a normal installation.
