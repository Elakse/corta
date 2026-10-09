import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { placeholders, interpolate } from "@/core/markup";
import { MathView, type MathProps } from "./View";

const schema = z.union([z.string().min(1).transform((tex) => ({ tex })), z.object({ tex: z.string().min(1) }).strict()]);

export default defineBlock<MathProps>({
  type: "math",
  version: 1,
  group: "content",
  schema: schema as z.ZodType<MathProps>,
  component: MathView,
  ruler: "self",
  reads: (p) => placeholders(p.tex),
  size: () => 0.5,
  describe: (p, s) => `[formula] ${interpolate(p.tex, s.vars)}`,
  docs: `A display formula (KaTeX), centered and aligned so its baseline sits on a rule. Use it for anything
tall: matrices, fractions, sums with limits, aligned equations (\\begin{aligned}…\\end{aligned}). Accepts \`{{var}}\`.
Shorthand: \`- math: "A v = \\\\lambda v"\` or with a block scalar.`,
  example: `- math: |
    A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}`,
});
