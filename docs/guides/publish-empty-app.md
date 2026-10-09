# Publish the empty app

The shared repository contains application code, reusable course-generation tooling, documentation,
database migrations and synthetic test fixtures. It does not contain personal courses or user state.

Ignored: `content/*` (except its README), original sources, processed extracts, databases, credentials,
dependencies, builds, test reports, local prototypes, agent output and historical implementation prompts.
The application must start with an empty library in a fresh clone. Browser tests opt into synthetic
fixtures through `VITE_CORTA_TEST_CONTENT=1`; regular builds omit them.

If the local repository's past commits contain personal data, do not push its history. Export the current
application into a separate checkout based on the destination's existing branch, honoring `.gitignore`
even for files tracked locally. Commit and push there normally, without force. Keep the local checkout
and its content/history intact. Exclusions must apply to the entire history being published.

Before pushing, validate the clean export, run unit/browser/ruler checks, build the empty app and inspect
the staged paths for data, generated artifacts and secrets. Only `.env.example` may be tracked.
