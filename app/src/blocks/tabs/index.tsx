import "./style.css";
import { z } from "zod";
import { useState } from "react";
import { defineBlock } from "@/core/registry";
import { BlockList } from "@/core/render";
import { renderInline } from "@/core/markup";
import { BlockListSchema } from "../shared";

const schema = z
  .object({
    tabs: z.array(z.object({ label: z.string().min(1), body: BlockListSchema }).strict()).min(2),
  })
  .strict();
type Props = z.infer<typeof schema>;

function TabsView({ props, ctx }: { props: Props; ctx: { path: string } }) {
  const [i, setI] = useState(0);
  const tab = props.tabs[i] ?? props.tabs[0]!;
  return (
    <div className="x-tabs">
      <div className="tabs-row" role="tablist" data-rl="text">
        {props.tabs.map((t, j) => (
          <button key={j} type="button" role="tab" aria-selected={i === j} className="tab" onClick={() => setI(j)} dangerouslySetInnerHTML={{ __html: renderInline(t.label) }} />
        ))}
      </div>
      <div role="tabpanel" className="tab-panel">
        <BlockList key={i} items={tab.body} path={`${ctx.path}.${i}`} />
      </div>
    </div>
  );
}

export default defineBlock<Props>({
  type: "tabs",
  version: 1,
  group: "layout",
  schema,
  component: TabsView,
  ruler: "self",
  children: (p) => p.tabs.map((t) => t.body),
  markup: (p) => p.tabs.map((t) => t.label),
  size: () => 0,
  describe: (p) => `[tabs: ${p.tabs.map((t) => t.label).join(" / ")}]`,
  docs: "Alternative explanations of the same thing (e.g. Algebraica / Geométrica / En código). Only one is visible at a time.",
  example: `- tabs:
    tabs:
      - { label: Algebraica, body: [ { text: "…" } ] }
      - { label: Geométrica, body: [ { text: "…" } ] }`,
});
