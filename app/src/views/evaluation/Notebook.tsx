import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContentNode, Course, Evaluation, PaperType } from "@/core/content";
import { walkNodes } from "@/core/content";
import { useRuler } from "@/core/ruler";
import { evaluationTree } from "@/core/progress";
import { useSetting } from "@/state/settings";
import { useTreeProgress } from "@/state/node-progress";
import { useUi } from "@/state/ui";
import { useVarsStore } from "@/core/vars";
import { pageBridge } from "@/llm/page-bridge";
import { useLocale } from "@/i18n";
import { fmtNotebookDate } from "../format";
import { PageContext, type PageContextValue } from "./page-context";
import { MarginLayer } from "./MarginLayer";
import { PaperSwitch } from "./PaperSwitch";
import { TopicSection } from "./TopicSection";
import { Overview } from "./overview/Overview";

const EAGER_TOPICS = 2;

function estimateLines(topic: ContentNode): number {
  let n = 3;
  walkNodes([topic], (x) => (n += 2 + x.body.length * 2));
  return Math.min(400, n);
}

/** The evaluation page: one endless spiral-notebook sheet (architecture.md §6). */
export function Notebook({ course, evaluation }: { course: Course; evaluation: Evaluation }) {
  const content = evaluation.content!;
  const locale = useLocale();
  const [paper, setPaper] = useSetting<PaperType>(`paper:${evaluation.key}`, content.paper);
  const sheetRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const ruler = useRuler(frameRef, flowRef);
  const vars = useVarsStore();
  useEffect(() => {
    pageBridge.set(vars, evaluation.key);
    return () => pageBridge.set(null, null);
  }, [vars, evaluation.key]);
  const [sheetEl, setSheetEl] = useState<HTMLElement | null>(null);
  useEffect(() => setSheetEl(sheetRef.current), []);

  // ---- lazy topics
  const [mounted, setMounted] = useState<ReadonlySet<string>>(() => new Set(content.topics.slice(0, EAGER_TOPICS).map((t) => t.id)));
  const mount = useCallback((ids: string[]) => setMounted((m) => (ids.every((i) => m.has(i)) ? m : new Set([...m, ...ids]))), []);
  const mountedNodes = useMemo(() => {
    const out: ContentNode[] = [];
    walkNodes(content.topics.filter((t) => mounted.has(t.id)), (n) => out.push(n));
    return out;
  }, [content.topics, mounted]);

  // ---- node registry + visibility (for the LLM context and the header's current topic)
  const elements = useRef(new Map<string, HTMLElement>()).current;
  const io = useMemo(
    () =>
      new IntersectionObserver(
        (entries) => {
          const setVisible = useUi.getState().setVisible;
          for (const e of entries) setVisible((e.target as HTMLElement).dataset.node!, e.isIntersecting ? Math.round(e.intersectionRatio * 100) / 100 : 0);
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
      ),
    [],
  );
  useEffect(
    () => () => {
      io.disconnect();
      useUi.setState({ visible: {}, selected: null });
    },
    [io],
  );
  const page: PageContextValue = useMemo(
    () => ({
      course,
      evaluation,
      evaluationDir: content.dir,
      language: course.data.language,
      registerNode: (id, el) => {
        if (!el) return () => undefined;
        elements.set(id, el);
        io.observe(el);
        return () => {
          io.unobserve(el);
          if (elements.get(id) === el) elements.delete(id);
        };
      },
      nodeElement: (id) => elements.get(id),
    }),
    [course, evaluation, content.dir, elements, io],
  );

  // ---- scroll requests (overview clicks, LLM navigateTo)
  const graphNodes = useMemo(() => {
    const topicOf = new Map<string, string>();
    for (const t of content.topics) walkNodes([t], (n) => topicOf.set(n.id, t.id));
    return topicOf;
  }, [content.topics]);
  const scrollTarget = useUi((s) => s.scrollTarget);
  useEffect(() => {
    if (!scrollTarget) return;
    const topic = graphNodes.get(scrollTarget.id);
    if (!topic) return;
    const idx = content.topics.findIndex((t) => t.id === topic);
    mount(content.topics.slice(0, idx + 1).map((t) => t.id));
    let tries = 0;
    const go = () => {
      const el = elements.get(scrollTarget.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.remove("flash");
        void el.offsetWidth;
        el.classList.add("flash");
        useUi.getState().select(scrollTarget.id);
      } else if (tries++ < 30) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }, [scrollTarget, graphNodes, content.topics, mount, elements]);

  // ---- header
  const tree = evaluationTree(evaluation);
  const progress = useTreeProgress(tree);
  const visible = useUi((s) => s.visible);
  const currentTopic = useMemo(() => {
    let best = content.topics[0];
    let score = -1;
    for (const t of content.topics) {
      const r = visible[t.id] ?? 0;
      if (r > score) {
        score = r;
        best = t;
      }
    }
    return best;
  }, [visible, content.topics]);
  const topicNumber = (t: ContentNode, i: number) => t.number ?? String(i + 1);
  const curIdx = currentTopic ? content.topics.indexOf(currentTopic) : -1;

  return (
    <PageContext.Provider value={page}>
      <div className="desk-page">
        <div className="desk-bar">
          <PaperSwitch value={paper} onChange={setPaper} />
        </div>
        <Overview evaluation={evaluation} />
        <article className="sheet" data-paper={paper} ref={sheetRef}>
          <div className="spiral" aria-hidden="true" />
          <div className="binder" aria-hidden="true" />
          <MarginLayer nodes={mountedNodes} ruler={ruler} sheet={sheetEl} />
          <header className="head">
            <div className="rows">
              <div className="course">
                {course.data.name}&nbsp;<span>· {evaluation.meta.title}</span>
              </div>
              <div className="topic">{currentTopic ? `${topicNumber(currentTopic, curIdx)} — ${currentTopic.title ?? ""}` : content.title}</div>
            </div>
            <div className="date">
              <div className="d">{evaluation.meta.date ? fmtNotebookDate(evaluation.meta.date, locale) : "—"}</div>
              <div className="prog" aria-label="progress">
                <div className="bar">
                  <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <span data-testid="eval-progress">{Math.round(progress * 100)} %</span>
              </div>
            </div>
          </header>
          <section className="frame" ref={frameRef}>
            <div className="flow" ref={flowRef}>
              {content.topics.map((t, i) => (
                <TopicSection key={t.id} topic={t} number={topicNumber(t, i)} mounted={mounted.has(t.id)} onNear={() => mount([t.id])} estimateLines={estimateLines(t)} />
              ))}
            </div>
          </section>
        </article>
      </div>
    </PageContext.Provider>
  );
}
