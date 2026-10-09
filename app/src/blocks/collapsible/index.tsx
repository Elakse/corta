import "./style.css";
import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { BlockListSchema } from "../shared";
import { CollapsibleView } from "./View";

const schema = z
  .object({
    label: z.string().min(1),
    open: z.boolean().default(false),
    body: BlockListSchema,
  })
  .strict();
export type CollapsibleProps = z.infer<typeof schema>;

export default defineBlock<CollapsibleProps>({
  type: "collapsible",
  version: 1,
  group: "layout",
  schema,
  component: CollapsibleView,
  ruler: "self",
  children: (p) => [p.body],
  markup: (p) => [p.label],
  size: () => 0,
  describe: (p) => `[collapsible "${p.label}"]`,
  docs: `Hidden content behind a handwritten toggle (proofs, derivations, long examples). Closed by default.
For exercise solutions use the \`exercise\` block instead (it adds the "solved" button and the solution's basis).`,
  example: `- collapsible:
    label: Demostración
    body:
      - text: "Inducción en $k$…"`,
});
