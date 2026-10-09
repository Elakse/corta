import { defineKind } from "@/core/registry";

export default [
  defineKind({
    kind: "section",
    label: { es: "Sección", en: "Section" },
    heading: "section",
    glyph: "§",
    container: true,
    docs: "A topic or sub-topic. Drawn as a numbered heading. A container by default: its checkbox is fully derived from its children.",
  }),
];
