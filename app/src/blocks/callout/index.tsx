import "./style.css";
import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { BlockList } from "@/core/render";
import { renderInline } from "@/core/markup";
import { BlockListSchema } from "../shared";

const schema = z
  .object({
    variant: z.enum(["note", "warning", "tip", "exam"]).default("note"),
    title: z.string().optional(),
    body: BlockListSchema,
  })
  .strict();
type Props = z.infer<typeof schema>;

export default defineBlock<Props>({
  type: "callout",
  version: 1,
  group: "layout",
  schema,
  component: ({ props, ctx }) => (
    <aside className={`x-callout v-${props.variant}`}>
      {props.title && <div className="callout-title" data-rl="text" dangerouslySetInnerHTML={{ __html: renderInline(props.title) }} />}
      <BlockList items={props.body} path={`${ctx.path}.0`} />
    </aside>
  ),
  ruler: "self",
  children: (p) => [p.body],
  markup: (p) => (p.title ? [p.title] : []),
  size: () => 0,
  describe: (p) => `[${p.variant}${p.title ? `: ${p.title}` : ""}]`,
  docs: `A side note with a colored margin bar: \`note\` (neutral), \`warning\` (common mistake), \`tip\`,
\`exam\` (how this is usually asked in exams; cite the exam in the node's sources).`,
  example: `- callout:
    variant: warning
    title: Error común
    body:
      - text: "$v \\\\neq 0$ siempre: el vector nulo nunca es autovector."`,
});
