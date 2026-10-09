import { z } from "zod";
import { defineKind } from "@/core/registry";

const Origin = z
  .object({
    /** source id in sources.yaml the exercise is taken from */
    ref: z.string().min(1),
    /** where in the source, e.g. "Ej. 4" or "p. 2, ej. 3b" */
    locator: z.string().min(1),
  })
  .strict();

export default [
  defineKind({
    kind: "exercise",
    label: { es: "Ejercicio", en: "Exercise" },
    heading: "label",
    glyph: "✎",
    fields: z.object({ origin: Origin }).strict(),
    validate(node) {
      const hasBlock = node.body.some((b) => b.type === "block" && b.blockType === "exercise");
      return hasBlock ? [] : [{ severity: "error", path: "body", message: "an exercise node needs one `exercise` block (statement + hidden solution)" }];
    },
    docs: "A practice exercise taken from the sources (never invented). Requires `origin: { ref, locator }` and an `exercise` block whose solution says if it's official or generated.",
  }),
];
