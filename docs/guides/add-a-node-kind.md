# Add a node kind

Kinds are open labels on nodes (`definition`, `theorem`, `exercise`…). They live in `app/src/kinds/*.ts`;
every file default-exports one `defineKind(...)` or an array. Add an entry to an existing file (or a new file):

```ts
defineKind({
  kind: "algorithm",
  label: { es: "Algoritmo", en: "Algorithm" },   // per course language
  heading: "label",            // "section" (numbered heading) | "label" (KIND · Title line) | "none"
  glyph: "⟳",                  // one symbol for overviews
  container: false,            // default for `container` (no own checkbox state)
  fields: z.object({ complexity: z.string() }).strict(),   // optional extra YAML fields
  validate: (node) => [],      // optional kind-specific checks → { severity, path, message, hint }
  docs: "An algorithm as taught in class: steps, complexity, a worked trace.",
})
```

Then `npm run catalog` (the skill learns it) and `npm test`.
