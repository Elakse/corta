import "../controls.css";
import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { useVar } from "@/core/vars";
import { useId } from "react";
import { MathText } from "@/ui/MathText";

const schema = z.object({ var: z.string(), label: z.string() }).strict();
type Props = z.infer<typeof schema>;

function ToggleView({ props }: { props: Props }) {
  const labelId = useId();
  const [v, set] = useVar<boolean>(props.var);
  const on = v === true;
  return (
    <div className="ctl ctl-toggle">
      <button type="button" role="switch" aria-checked={on} aria-labelledby={labelId} className="switch" onClick={() => set(!on)}>
        <span className="knob" />
      </button>
      <span id={labelId} className="ctl-label"><MathText text={props.label} /></span>
    </div>
  );
}

export default defineBlock<Props>({
  type: "toggle",
  version: 1,
  group: "control",
  interactive: true,
  schema,
  component: ToggleView,
  ruler: "snap",
  writes: (p) => [p.var],
  markup: (p) => [p.label],
  size: () => 0,
  describe: (p, s) => `[toggle ${p.label}: ${s.vars[p.var] ? "on" : "off"}]`,
  docs: "A switch that writes a boolean page variable (e.g. showForces). Graphs and canvases can show/hide things with it.",
  example: `- toggle: { var: showEigen, label: "Mostrar autoespacios" }`,
});
