import "../graph2d/style.css";
import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { CanvasView } from "./View";

const schema = z
  .object({
    /** module name: evaluations/<eval>/canvas/<module>.tsx */
    module: z.string().regex(/^[a-z0-9-]+$/, "module names are kebab-case file names without .tsx"),
    /** preferred height in ruled lines; modules may grow for wrapped controls */
    height: z.number().int().min(3).max(40).default(9),
    /** static props passed to the module */
    props: z.record(z.string(), z.unknown()).default({}),
    /** page variables the module reads / writes (declared here because code can't be inspected) */
    reads: z.array(z.string()).default([]),
    writes: z.array(z.string()).default([]),
    describe: z.string().optional(),
  })
  .strict();
export type CanvasProps = z.infer<typeof schema>;

export default defineBlock<CanvasProps>({
  type: "canvas",
  version: 1,
  group: "freeform",
  interactive: true,
  schema,
  component: CanvasView,
  ruler: "snap",
  card: true,
  reads: (p) => p.reads,
  writes: (p) => p.writes,
  size: () => 1,
  describe: (p, s) => `[interactive graphic "${p.module}"${p.describe ? `: ${p.describe}` : ""}${p.reads.length ? `; reads ${p.reads.map((r) => `${r}=${String(s.vars[r])}`).join(", ")}` : ""}]`,
  docs: `Freeform interactive graphic: a TSX module written for this page, in \`evaluations/<eval>/canvas/<module>.tsx\`.
Use it when no prebuilt block can express the idea. The module default-exports a React component that receives
\`{ vars, setVar, tokens, kit, width, height, props }\`: page variables, a setter, live design tokens, the
graphics kit (Plane, Grid, Axes, Vector, Point, Label, Segment, Curve, Shape, Transition, DensityField, MathText, SvgMathLabel), the card's inner size
and the static \`props\` from YAML. \`height\` is a preferred drawing budget: the host can grow if wrapped controls
or labels need extra space. Measure controls instead of subtracting a fixed header height. Declare every variable it touches in \`reads\`/\`writes\`, and add a one-line
\`describe\` for the LLM. \`kit.Label\` renders string children with \`$TeX$\` as measured math. Use
\`kit.MathText\` for HTML controls/readouts and \`kit.SvgMathLabel\` for custom SVG coordinates; never draw
TeX through raw SVG \`<text>\` or canvas \`fillText\`. Keep formulas whole when wrapping and measure their
rendered dimensions, including height, to avoid clipping. Errors are caught and shown in place.`,
  example: `- canvas:
    module: eigen-demo
    height: 9
    reads: [theta]
    writes: [theta]
    describe: "v rotates with θ; shows Av and the eigen-directions of A"`,
});
