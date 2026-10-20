# Publish the empty app

The shared repository contains application code, reusable course-generation tooling, documentation,
database migrations and synthetic test fixtures. It does not contain personal courses or user state.

Ignored: `content/*` (except its README), original sources, processed extracts, databases, credentials,
dependencies, builds, test reports, local prototypes, agent output and historical implementation prompts.
The application must start with an empty library in a fresh clone. Browser tests opt into synthetic
fixtures through `VITE_CORTA_TEST_CONTENT=1`; regular builds omit them.

The local `main` and `origin/main` share the clean public history. Personal files remain on disk,
ignored and untracked. Normal updates use `git add .`, `git commit -m "Description"`, then `git push`.
Only `content/README.md` is tracked under `content/`. Never force-add personal material.

`.gitignore` does not stop tracking files already in Git. Check `git ls-files -ci --exclude-standard`
before publishing: it must print nothing. Removing a file from the index does not remove it from old
commits, so a branch with personal material in its history must not be pushed.

For a migration from private history, first save and verify a Git bundle outside the repository and
back up uncommitted changes. Export the current application into a separate checkout based on the
destination's existing branch, honoring `.gitignore` even for tracked files. Validate and commit there.
With explicit authorization, align the original local `main` to that clean commit using a mixed reset
(never a hard reset), which preserves working files. Verify private-file hashes, ignored/untracked
status and the public tree before pushing normally, without force. Keep the backup for recovery.
Exclusions must apply to the entire history being published.

Before pushing, validate the clean export, run unit/browser/ruler checks, build the empty app and inspect
the staged paths for data, generated artifacts and secrets. Only `.env.example` may be tracked.

2026-10-20 migration verification on Windows: typecheck, empty content validation (zero errors/warnings),
production build and browser smoke of the empty library passed. Unit tests: 142/143 passed; the unchanged
source-path test expects a drive-less path on Windows. Browser suite: 49/52 passed, including all 16 ruler
cases on synthetic content. Failures: two clipped eigenvalue labels in the synthetic mobile canvas and
missing 3D KaTeX labels at 1440/400px. These remain open; migration changes documentation and Git metadata,
not application behavior. Local study files are excluded from this export's test scope.
