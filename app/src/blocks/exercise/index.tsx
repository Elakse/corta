import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { BlockListSchema } from "../shared";
import { ExerciseView } from "./View";

const schema = z
  .object({
    /** the statement, if not already written as blocks before this one */
    statement: BlockListSchema.default([]),
    solution: z
      .object({
        /** official = taken from a source (solution sheet, class); generated = written to help study */
        basis: z.enum(["official", "generated"]),
        ref: z.string().optional(),
        locator: z.string().optional(),
        label: z.string().optional(),
        body: BlockListSchema.min(1),
      })
      .strict(),
  })
  .strict();
export type ExerciseProps = z.infer<typeof schema>;

export default defineBlock<ExerciseProps>({
  type: "exercise",
  version: 1,
  group: "practice",
  schema,
  component: ExerciseView,
  ruler: "self",
  children: (p) => [p.statement, p.solution.body],
  size: () => 1,
  describe: (p) => `[exercise; solution ${p.solution.basis}${p.solution.ref ? ` from ${p.solution.ref}` : ""}, hidden until opened]`,
  docs: `Practice: an optional statement, then a hidden worked solution behind "Ver resolución", ending with a
"Lo resolví bien" button that marks the exercise node as learned. Lives inside a node of kind \`exercise\`
(which carries \`origin: { ref, locator }\`, because exercises always come from the sources).
\`solution.basis\`: \`official\` if a source has the solution (give \`ref\`/\`locator\`), \`generated\` otherwise.
Solutions follow the staff's notation, steps and level of detail.`,
  example: `- exercise:
    statement:
      - text: "Hallar los autovalores de"
      - math: "A = \\\\begin{pmatrix} 4 & 1 \\\\\\\\ 2 & 3 \\\\end{pmatrix}"
    solution:
      basis: generated
      body:
        - math: "\\\\chi_A(\\\\lambda) = (\\\\lambda-5)(\\\\lambda-2)"`,
});
