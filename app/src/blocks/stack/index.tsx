import { defineBlock } from "@/core/registry";
import { BlockList } from "@/core/render";
import { BlockListSchema } from "../shared";

export default defineBlock<unknown[]>({
  type: "stack",
  version: 1,
  group: "layout",
  schema: BlockListSchema,
  component: ({ props, ctx }) => (
    <div className="x-stack">
      <BlockList items={props} path={`${ctx.path}.0`} />
    </div>
  ),
  ruler: "self",
  children: (p) => [p],
  size: () => 0,
  describe: () => "[stack]",
  docs: "Groups blocks vertically (useful as one column's content or a tab's body when you need a single item).",
  example: `- stack:
    - text: "Primero esto"
    - math: "x^2"`,
});
