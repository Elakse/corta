# Add a priority strategy

The Home "next priority" card asks the active strategy (setting `priority.strategy`, default
`deadline-pressure`) to rank candidates. Strategies live in `app/src/priority/strategies/*.ts` (auto-discovered).

```ts
export default defineStrategy({
  id: "exam-first",
  label: "Exams first",
  description: "…",
  rank: ({ graph, done, sessions, today }) => [ /* PriorityCandidate[] sorted best-first */ ],
});
```

A candidate carries `evaluationKey`, `score`, `daysLeft`, `remaining` (fraction left, or `null` without content),
`plannedHours` and a `reason` (i18n key + params) shown on the card. Use the progress engine
(`evaluationTree`, `progress`, `effectiveWeight`) instead of re-deriving anything. Write a unit test with a
small `buildContent` fixture (see `deadline-pressure.test.ts`). To switch: `PUT /api/settings/priority.strategy`
with `{ "value": "exam-first" }` (a settings UI is still an open question).

**v1 strategy (`deadline-pressure`)**: score = remaining weighted content ÷ (days left + ½ × planned study hours
before the date). Evaluations without content count as 8 units. Looks 60 days ahead; a retake only counts once
the evaluation it retakes has happened; finished evaluations drop out.
