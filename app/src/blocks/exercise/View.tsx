import type { BlockComponentProps } from "@/core/registry";
import { BlockList } from "@/core/render";
import { useCollapsible } from "@/state/ui";
import { useNodeProgress } from "@/state/node-progress";
import { useT } from "@/i18n";
import { Reveal } from "../collapsible/View";
import type { ExerciseProps } from "./index";

export function ExerciseView({ props, ctx }: BlockComponentProps<ExerciseProps>) {
  const t = useT();
  const [open, setOpen] = useCollapsible(ctx.nodeId, ctx.path);
  const { status, setDone } = useNodeProgress(ctx.nodeId);
  const sol = props.solution;
  return (
    <div className="x-exercise">
      <BlockList items={props.statement} path={`${ctx.path}.0`} />
      <Reveal
        label={sol.label ?? t("exercise.show")}
        open={open}
        onToggle={() => setOpen(!open)}
        aside={<span className="sol-basis">{t(sol.basis === "official" ? "exercise.official" : "exercise.generated")}</span>}
      >
        <BlockList items={sol.body} path={`${ctx.path}.1`} />
        <div className="solved-row">
          <button type="button" className="solved" data-done={status === "done"} onClick={() => setDone(true)}>
            {status === "done" ? `✓ ${t("exercise.solvedDone")}` : t("exercise.solved")}
          </button>
        </div>
      </Reveal>
    </div>
  );
}
