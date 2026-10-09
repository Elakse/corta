import "./style.css";
import { z } from "zod";
import { lazy } from "react";
import { defineBlock } from "@/core/registry";
import { exprVars } from "@/core/expr";

const Num = z.union([z.number(), z.string()]);
const Pt = z.tuple([Num, Num]);
const Color = z.string().default("pen");

export const Graph2DSchema = z
  .object({
    /** height in ruled lines */
    height: z.number().int().min(4).max(30).default(9),
    view: z.object({ x: z.tuple([z.number(), z.number()]), y: z.tuple([z.number(), z.number()]) }).strict().default({ x: [-5, 5], y: [-4, 4] }),
    grid: z.boolean().default(true),
    plots: z.array(z.object({ fn: z.string(), color: Color, dashed: z.boolean().default(false), label: z.string().optional() }).strict()).default([]),
    parametric: z.array(z.object({ x: z.string(), y: z.string(), t: z.tuple([z.number(), z.number()]), color: Color }).strict()).default([]),
    vectors: z.array(z.object({ from: Pt.default([0, 0]), to: Pt, color: Color, label: z.string().optional() }).strict()).default([]),
    segments: z.array(z.object({ from: Pt, to: Pt, color: z.string().default("ink-soft"), dashed: z.boolean().default(true) }).strict()).default([]),
    points: z
      .array(
        z
          .object({
            at: Pt,
            color: Color,
            label: z.string().optional(),
            /** make it draggable: dragging writes these page variables */
            drag: z.object({ x: z.string().optional(), y: z.string().optional() }).strict().optional(),
          })
          .strict(),
      )
      .default([]),
    caption: z.string().optional(),
  })
  .strict();
export type Graph2DProps = z.infer<typeof Graph2DSchema>;

const nums = (p: Graph2DProps) => [
  ...p.plots.flatMap((x) => exprVars(x.fn, ["x"])),
  ...p.parametric.flatMap((x) => [...exprVars(x.x, ["t"]), ...exprVars(x.y, ["t"])]),
  ...p.vectors.flatMap((v) => [...v.from, ...v.to].flatMap((n) => exprVars(n))),
  ...p.segments.flatMap((v) => [...v.from, ...v.to].flatMap((n) => exprVars(n))),
  ...p.points.flatMap((v) => v.at.flatMap((n) => exprVars(n))),
];

export default defineBlock<Graph2DProps>({
  type: "graph2d",
  version: 1,
  group: "visual",
  schema: Graph2DSchema as unknown as z.ZodType<Graph2DProps>,
  component: lazy(() => import("./View")),
  ruler: "snap",
  card: true,
  reads: (p) => [...new Set(nums(p))],
  writes: (p) => p.points.flatMap((pt) => [pt.drag?.x, pt.drag?.y].filter((v): v is string => !!v)),
  markup: (p) => (p.caption ? [p.caption] : []),
  size: () => 1,
  describe: (p) =>
    `[2D graph${p.plots.length ? `; y = ${p.plots.map((x) => x.fn).join(", ")}` : ""}${p.vectors.length ? `; vectors to ${p.vectors.map((v) => `(${v.to.join(", ")})`).join(", ")}` : ""}${p.points.length ? `; ${p.points.length} point(s)` : ""}]`,
  docs: `An interactive 2D plot (Mafs) on a taped card. Numbers can be expressions using Math functions and page
variables (e.g. \`"k * sin(x)"\`, \`["cos(theta)", "sin(theta)"]\`); the graph redraws when variables change.
\`plots\` are y = f(x) with \`fn\` an expression in x; \`parametric\` takes x(t), y(t); \`vectors\`, \`segments\`, \`points\`.
A point with \`drag: { x: a, y: b }\` is draggable and writes those variables. Colors are token names
(pen, red, learned-ink, ink-soft, ev-…). \`height\` in ruled lines.`,
  example: `- graph2d:
    view: { x: [-3, 3], y: [-2, 2] }
    plots: [ { fn: "k * sin(x)" } ]
    points: [ { at: [a, "k * sin(a)"], drag: { x: a }, label: "P" } ]`,
});
