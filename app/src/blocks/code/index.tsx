import "./style.css";
import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { CodeView } from "./View";

const schema = z
  .object({
    lang: z.string().default("text"),
    code: z.string(),
  })
  .strict();
export type CodeProps = z.infer<typeof schema>;

export default defineBlock<CodeProps>({
  type: "code",
  version: 1,
  group: "content",
  schema,
  component: CodeView,
  ruler: "snap",
  surface: true,
  size: (p) => 0.3 + p.code.split("\n").length * 0.12,
  describe: (p) => `[code ${p.lang}]\n${p.code}`,
  docs: `Source code on its own card (language label, line numbers, copy button), highlighted with Shiki in the notebook's own ink colors.
\`lang\` is any Shiki language id (python, java, c, js, ts, sql, haskell, bash…). Long lines scroll sideways.
Use the staff's own code style and identifiers.`,
  example: `- code:
    lang: python
    code: |
      import numpy as np
      vals, vecs = np.linalg.eig(A)`,
});
