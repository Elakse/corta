import "../controls.css";
import { z } from "zod";
import { useId } from "react";
import { defineBlock } from "@/core/registry";
import { useVar } from "@/core/vars";
import { formatVar } from "@/core/markup";

const schema = z
  .object({
    var: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number().positive().default(1),
    label: z.string().optional(),
    unit: z.string().default(""),
  })
  .strict()
  .refine((p) => p.max > p.min, "max must be greater than min");
type Props = z.infer<typeof schema>;

function SliderView({ props }: { props: Props }) {
  const id = useId();
  const [v, set] = useVar<number>(props.var);
  const value = typeof v === "number" ? v : props.min;
  const pct = ((value - props.min) / (props.max - props.min)) * 100;
  return (
    <div className="ctl ctl-slider">
      <label htmlFor={id}>{props.label ?? props.var}</label>
      <input id={id} type="range" min={props.min} max={props.max} step={props.step} value={value} style={{ ["--pct" as string]: `${pct}%` }} onChange={(e) => set(Number(e.target.value))} />
      <output htmlFor={id}>
        {formatVar(value)}
        {props.unit}
      </output>
    </div>
  );
}

export default defineBlock<Props>({
  type: "slider",
  version: 1,
  group: "control",
  schema: schema as unknown as z.ZodType<Props>,
  component: SliderView,
  ruler: "snap",
  writes: (p) => [p.var],
  size: () => 0,
  describe: (p, s) => `[slider ${p.label ?? p.var} = ${formatVar(s.vars[p.var])}${p.unit} (range ${p.min}..${p.max})]`,
  docs: `A slider that writes a numeric page variable. Declare the variable (with its initial value) in a node's \`vars\`.
Every block that reads it (graphs, text with {{var}}, canvases) updates live.`,
  example: `- slider: { var: theta, min: 0, max: 359, label: "θ", unit: "°" }`,
});
