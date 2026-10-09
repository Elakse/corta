import "../controls.css";
import { z } from "zod";
import { useId } from "react";
import { defineBlock } from "@/core/registry";
import { useVar } from "@/core/vars";
import { formatVar } from "@/core/markup";

const schema = z
  .object({
    var: z.string(),
    label: z.string(),
    type: z.enum(["number", "text"]).default("number"),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
  })
  .strict();
type Props = z.infer<typeof schema>;

function InputView({ props }: { props: Props }) {
  const id = useId();
  const [v, set] = useVar(props.var);
  return (
    <div className="ctl ctl-input">
      <label htmlFor={id}>{props.label}</label>
      <input
        id={id}
        type={props.type}
        value={v === undefined ? "" : String(v)}
        min={props.min}
        max={props.max}
        step={props.step ?? "any"}
        onChange={(e) => {
          if (props.type === "text") return set(e.target.value);
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n)) set(n);
        }}
      />
    </div>
  );
}

export default defineBlock<Props>({
  type: "input",
  version: 1,
  group: "control",
  schema,
  component: InputView,
  ruler: "snap",
  writes: (p) => [p.var],
  size: () => 0,
  describe: (p, s) => `[input ${p.label} = ${formatVar(s.vars[p.var])}]`,
  docs: "A small number/text field that writes a page variable (e.g. a matrix entry, a sample size).",
  example: `- input: { var: n, label: "n", type: number, min: 1, max: 50 }`,
});
