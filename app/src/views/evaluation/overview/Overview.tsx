import { lazy, Suspense, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Evaluation } from "@/core/content";
import { useProgress } from "@/state/progress";
import { useSetting } from "@/state/settings";
import { useT, type StringKey } from "@/i18n";
import { motionTokens } from "@/theme";
import { overviewTree } from "./model";
import { Treemap } from "./Treemap";
import { TreeView } from "./TreeView";

const DepGraph = lazy(() => import("./DepGraph"));

const VIEWS = [
  { id: "treemap", label: "overview.treemap" },
  { id: "graph", label: "overview.graph" },
  { id: "tree", label: "overview.tree" },
] as const satisfies readonly { id: string; label: StringKey }[];
type ViewId = (typeof VIEWS)[number]["id"];

/** Bird's-eye view of the evaluation: same data, three switchable views. Every element scrolls to its node. */
export function Overview({ evaluation }: { evaluation: Evaluation }) {
  const t = useT();
  const [view, setView] = useState<ViewId>("treemap");
  const [hidden, setHidden] = useSetting("overview.hidden", false);
  const done = useProgress((s) => s.done);
  const tree = useMemo(() => overviewTree(evaluation, done), [evaluation, done]);
  return (
    <section className="overview" aria-label={t("overview.title")}>
      <div className="ov-bar">
        <div className="seg" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => { setView(v.id); setHidden(false); }}>
              {view === v.id && <motion.span layoutId="ov-seg" className="seg-pill" transition={{ duration: motionTokens.base, ease: motionTokens.ease }} />}
              <span className="seg-label">{t(v.label)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ov-toggle"
          aria-expanded={!hidden}
          aria-label={t(hidden ? "overview.show" : "overview.hide")}
          title={t(hidden ? "overview.show" : "overview.hide")}
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {!hidden && (
        <div className="ov-stage">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              className="ov-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: motionTokens.ease }}
            >
              {view === "treemap" && <Treemap tree={tree} />}
              {view === "tree" && <TreeView tree={tree} />}
              {view === "graph" && (
                <Suspense fallback={null}>
                  <DepGraph evaluation={evaluation} tree={tree} />
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
