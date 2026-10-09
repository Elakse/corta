import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { placeholders, toPlain, interpolate } from "@/core/markup";
import { textSize } from "../shared";
import { TextView } from "./View";

const schema = z.string();

export default defineBlock({
  type: "text",
  version: 1,
  group: "content",
  schema,
  component: TextView,
  ruler: "self",
  reads: (p) => placeholders(p),
  markup: (p) => [p],
  size: (p) => Math.max(0.3, textSize(p)),
  describe: (p, s) => toPlain(interpolate(p, s.vars)),
  docs: `Rich text: Markdown (**bold**, *italic*, \`code\`, lists, [links](url)), ==highlight== for key terms,
inline math \`$…$\` and display math \`$$…$$\` (KaTeX), and \`{{var}}\` to show a page variable's live value.
Paragraphs are separated by a blank line. **Tall-math rule:** inline math must stay one line tall; matrices,
\\frac, sums/integrals with limits go in display math (\`$$…$$\` on its own paragraph, or a \`math\` block).
In YAML prefer a block scalar (\`|\`) so backslashes don't need escaping.`,
  example: `- text: |
    Un escalar $\\lambda$ es un ==autovalor== de $A$ si existe $v \\neq 0$ tal que
    $$A v = \\lambda v$$`,
});
