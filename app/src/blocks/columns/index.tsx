import "./style.css";
import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { BlockList } from "@/core/render";

const schema = z.array(z.array(z.unknown())).min(2).max(4);

export default defineBlock<unknown[][]>({
  type: "columns",
  version: 1,
  group: "layout",
  schema,
  component: ({ props, ctx }) => (
    <div className="blk-cols" style={{ ["--cols" as string]: props.length }}>
      {props.map((col, i) => (
        <div className="blk-col" key={i}>
          <BlockList items={col} path={`${ctx.path}.${i}`} />
        </div>
      ))}
    </div>
  ),
  ruler: "self",
  children: (p) => p,
  size: () => 0,
  describe: (p) => `[${p.length} columns]`,
  docs: `Side-by-side columns (2–4), each a list of blocks. Typical: a graph card next to its explanation and controls.
Columns stack vertically on phones. "Text with an image" is \`columns\` with \`text\` + \`image\`, not its own block.`,
  example: `- columns:
    - [ { graph2d: { plots: [ { fn: "x => k * x" } ] } } ]
    - [ { slider: { var: k, min: -3, max: 3, step: 0.1 } }, { text: "Pendiente $k = {{k}}$" } ]`,
});
