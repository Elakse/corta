import "./style.css";
import { z } from "zod";
import { lazy } from "react";
import { defineBlock } from "@/core/registry";

const schema = z.union([
  z.string().min(1).transform((code) => ({ code, caption: undefined as string | undefined })),
  z.object({ code: z.string().min(1), caption: z.string().optional() }).strict(),
]);
export type DiagramProps = { code: string; caption?: string };

export default defineBlock<DiagramProps>({
  type: "diagram",
  version: 1,
  group: "visual",
  schema: schema as unknown as z.ZodType<DiagramProps>,
  component: lazy(() => import("./View")),
  ruler: "snap",
  surface: true,
  markup: (p) => (p.caption ? [p.caption] : []),
  labels: (p) => [p.code],
  size: () => 1,
  describe: (p) => `[diagram (mermaid)]\n${p.code}`,
  docs: `A diagram written in Mermaid. Flowcharts (\`flowchart LR|TD\`) and state diagrams (\`stateDiagram-v2\`) are drawn by
Corta's own engine: layered layout, curved edges that never cross a node, edge-label chips, hover to light every path
through a node. On narrow screens horizontal diagrams may reflow vertically, with compact spacing and full phone
width; node labels and connections stay unchanged. Larger diagrams retain horizontal scrolling. Supported: nodes
\`A[text]\` \`A(text)\` \`A((text))\` \`A([text])\` \`A{text}\`, links \`-->\` \`---\` \`-.->\` \`==>\`,
link text \`-->|text|\` or \`-- text -->\`, \`<br/>\` line breaks, quoted labels, chains; states with \`[*]\` start/end and
\`: label\` transitions. Anything else in a flowchart (subgraph, style, classDef, \`&\`) or any other kind (class, sequence,
ER, mindmap…) is drawn by Mermaid itself, in the same card. Self-loops also use the complete Mermaid fallback.
Write mathematical node/edge labels with \`$TeX$\` (\`$$TeX$$\` is accepted too), e.g. \`A["$F_X^{-1}(u)$"]\`
and \`-->|"$P(A\\mid B)$"|\`. Prose stays literal; programming names/identifiers are not guessed to be math.
KaTeX formulas are measured in both width and height, including fractions and limits; taller labels grow their
boxes. Use \`<br/>\` between complete formulas/prose lines. The fallback normalizes math to Mermaid's native
double-dollar syntax and uses the same KaTeX fonts. Keep labels short; quote labels with special characters.`,
  example: `- diagram:
    code: |
      flowchart LR
        A[Clase] -->|instancia| B(Objeto)
        B --> C{¿Mensaje?}`,
});
