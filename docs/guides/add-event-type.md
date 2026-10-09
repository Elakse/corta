# Add a calendar event type

Event types live in `app/src/calendar/types/*.tsx` (auto-discovered). Each one says how its events are
**derived** (from content and/or state, never copied), how they look and how the day panel shows them.

```tsx
export default defineEventType({
  type: "office-hours",
  label: "kind.officeHours",        // add the string to app/src/i18n/strings.ts (es + en)
  color: "ev-class",                // a token (add a new one to theme/tokens.ts + tailwind.css if needed)
  icon: Coffee,                     // lucide-react icon
  order: 2,                         // drawing order within a day
  key: false,                       // key dates show in "Ir a" and get emphasis
  sync: true,                       // include in the Google Calendar push
  evaluationKinds: undefined,       // set if it represents evaluation kinds (colors them everywhere)
  derive: ({ graph, sessions }) => [ /* CalendarEvent[] with stable ids, e.g. "office-hours:<course>@<date>" */ ],
  DayItem: ({ event }) => <DayItemBase event={event}>…</DayItemBase>,
});
```

Rules: ids must be stable (they key the Google sync); link `href` to the real entity; derive from
`course.yaml`/`semester.yaml` fields (add fields to the schema in `core/content/schemas.ts` + `docs/content-format.md`
if the data doesn't exist yet). Add a unit test next to `calendar/derive.test.ts`.
