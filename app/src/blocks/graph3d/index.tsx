import "../graph2d/style.css";
import { z } from "zod";
import { lazy } from "react";
import { defineBlock } from "@/core/registry";
import { exprVars } from "@/core/expr";

const Num = z.union([z.number(), z.string()]);
const P3 = z.tuple([Num, Num, Num]);

const schema = z
  .object({
    height: z.number().int().min(6).max(30).default(12),
    axes: z.boolean().default(true),
    camera: z.tuple([z.number(), z.number(), z.number()]).default([5, 3.6, 5]),
    surfaces: z
      .array(
        z
          .object({
            /** z as an expression of x and y */
            z: z.string(),
            x: z.tuple([z.number(), z.number()]).default([-2, 2]),
            y: z.tuple([z.number(), z.number()]).default([-2, 2]),
            color: z.string().default("pen"),
            opacity: z.number().min(0.05).max(1).default(0.45),
            segments: z.number().int().min(4).max(120).default(48),
          })
          .strict(),
      )
      .default([]),
    vectors: z.array(z.object({ from: P3.default([0, 0, 0]), to: P3, color: z.string().default("red"), label: z.string().optional() }).strict()).default([]),
    points: z.array(z.object({ at: P3, color: z.string().default("pen"), label: z.string().optional() }).strict()).default([]),
    caption: z.string().optional(),
  })
  .strict();
export type Graph3DProps = z.infer<typeof schema>;

export default defineBlock<Graph3DProps>({
  type: "graph3d",
  version: 1,
  group: "visual",
  interactive: true,
  schema: schema as unknown as z.ZodType<Graph3DProps>,
  component: lazy(() => import("./View")),
  ruler: "snap",
  card: true,
  reads: (p) => [
    ...new Set([
      ...p.surfaces.flatMap((s) => exprVars(s.z, ["x", "y"])),
      ...p.vectors.flatMap((v) => [...v.from, ...v.to].flatMap((n) => exprVars(n))),
      ...p.points.flatMap((v) => v.at.flatMap((n) => exprVars(n))),
    ]),
  ],
  markup: (p) => (p.caption ? [p.caption] : []),
  labels: (p) => [...p.vectors, ...p.points].flatMap(item => item.label ? [item.label] : []),
  size: () => 1,
  describe: (p) => `[3D scene${p.surfaces.length ? `; z = ${p.surfaces.map((s) => s.z).join(", ")}` : ""}${p.vectors.length ? `; ${p.vectors.length} vector(s)` : ""}]`,
  docs: `A 3D scene (react-three-fiber) with orbit controls: drag to rotate, scroll/pinch to zoom.
\`surfaces\` are z = f(x, y) over a range; \`vectors\` and \`points\` take [x, y, z] (numbers or expressions with
page variables). Math convention: z is up. Colors are token names. \`height\` in ruled lines.
Point/vector labels accept \`$TeX$\` and render as camera-facing math text.`,
  example: `- graph3d:
    surfaces: [ { z: "a * (x*x - y*y)", color: pen } ]
    vectors: [ { to: [1, 1, 0], color: red, label: v } ]`,
});
