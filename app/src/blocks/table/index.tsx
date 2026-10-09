import "./style.css";
import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { toPlain } from "@/core/markup";
import { TableView } from "./View";

const Cell = z.union([z.string(), z.number()]).transform(String);
const schema = z
  .object({
    columns: z.array(Cell).optional(),
    rows: z.array(z.array(Cell)).min(1),
    caption: z.string().optional(),
  })
  .strict();
export type TableProps = z.infer<typeof schema>;

export default defineBlock<TableProps>({
  type: "table",
  version: 1,
  group: "content",
  schema: schema as unknown as z.ZodType<TableProps>,
  component: TableView,
  ruler: "snap",
  surface: true,
  // a cell that is only one formula may be tall (the row hangs); everything else follows the tall-math rule
  markup: (p) => [...(p.columns ?? []), ...p.rows.flat(), ...(p.caption ? [p.caption] : [])].filter((c) => !/^\$[^$]+\$$/.test(c.trim())),
  size: (p) => 0.4 + p.rows.length * 0.25,
  describe: (p) => `[table] ${p.columns ? `${p.columns.map(toPlain).join(" | ")}; ` : ""}${p.rows.map((r) => r.map(toPlain).join(" | ")).join("; ")}`,
  docs: `A table on its own card above the ruled paper (header strip, hairline rows). Cells are inline Markdown + math.
Cells never wrap (the table scrolls sideways instead), so keep them short. A cell may hold a tall formula
(e.g. a matrix): the row simply grows to fit. Optional \`columns\` (header row) and \`caption\`.`,
  example: `- table:
    columns: [Matriz, "$\\\\chi_A(\\\\lambda)$", Autovalores]
    rows:
      - ["$A$", "$(\\\\lambda-3)(\\\\lambda-1)$", "$3,\\\\ 1$"]`,
});
