import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ContentNode, Course, Evaluation, PaperType } from "@/core/content";
import { walkNodes } from "@/core/content";
import { useRuler } from "@/core/ruler";
import { evaluationTree } from "@/core/progress";
import { useSetting } from "@/state/settings";
import { useTreeProgress } from "@/state/node-progress";
import { useUi } from "@/state/ui";
import { useVarsStore } from "@/core/vars";
import { pageBridge, usePageBridge } from "@/llm/page-bridge";
import { createViewportTracker } from "@/llm/viewport";
import { SelectionMenu } from "@/llm/selection/SelectionMenu";
import { selectionText } from "@/llm/selection/read";
import { DEFAULT_MARKER, markerVar, useHighlighter, type MarkerColor } from "@/core/highlighter";
import { useLocale } from "@/i18n";
import { fmtNotebookDate } from "../format";
import { PageContext, type PageContextValue } from "./page-context";
import { MarginLayer } from "./MarginLayer";
import { useReadingPosition } from "./useReadingPosition";
import { TopicSection } from "./TopicSection";
import { Overview } from "./overview/Overview";
import { MathText } from "@/ui/MathText";

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
  const [paper] = useSetting<PaperType>(`paper:${evaluation.key}`, content.paper);
  const sheetRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const ruler = useRuler(frameRef, flowRef);
  const inkRef = useRef<SVGSVGElement>(null);
  const [marker] = useSetting<MarkerColor>("highlighter.color", DEFAULT_MARKER);
  useHighlighter(flowRef, inkRef, selectionText);
  const vars = useVarsStore();
  useEffect(() => {
    pageBridge.set(vars, evaluation.key);
    return () => pageBridge.set(null, null);
  }, [vars, evaluation.key]);
  const fillRef = useRef<SVGSVGElement>(null);
  const [sheetEl, setSheetEl] = useState<HTMLElement | null>(null);
  const [fillEl, setFillEl] = useState<SVGSVGElement | null>(null);
  useEffect(() => {
    setSheetEl(sheetRef.current);
    setFillEl(fillRef.current);
  }, []);

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
  const tracker = useRef<ReturnType<typeof createViewportTracker> | null>(null);
  useEffect(() => {
    const observer = createViewportTracker(sheetRef.current!.closest(".app-main") as HTMLElement, flowRef.current!);
    tracker.current = observer;
    for (const [id, el] of elements) observer.register(id, el);
    usePageBridge.setState({ refresh: observer.measure });
    return () => {
      observer.disconnect();
      tracker.current = null;
      usePageBridge.setState({ refresh: null });
    };
  }, [elements]);
  const page: PageContextValue = useMemo(
    () => ({
      course,
      evaluation,
      evaluationDir: content.dir,
      language: course.data.language,
      registerNode: (id, el) => {
        if (!el) return () => undefined;
        elements.set(id, el);
        tracker.current?.register(id, el);
        return () => {
          tracker.current?.unregister(id, el);
          if (elements.get(id) === el) elements.delete(id);
        };
      },
      nodeElement: (id) => elements.get(id),
    }),
    [course, evaluation, content.dir, elements],
  );

  // ---- scroll requests (overview clicks, LLM navigateTo)
  const graphNodes = useMemo(() => {
    const topicOf = new Map<string, string>();
    for (const t of content.topics) walkNodes([t], (n) => topicOf.set(n.id, t.id));
    return topicOf;
  }, [content.topics]);
  /** Mounts the node's topic and every one above it (so heights above are real); false for an unknown id. */
  const revealNode = useCallback(
    (id: string) => {
      const topic = graphNodes.get(id);
      if (!topic) return false;
      const idx = content.topics.findIndex((t) => t.id === topic);
      mount(content.topics.slice(0, idx + 1).map((t) => t.id));
      return true;
    },
    [graphNodes, content.topics, mount],
  );
  const scrollTarget = useUi((s) => s.scrollTarget);
  // a request that outlives its page is stale: coming back must restore the reading position, not replay it
  useEffect(() => () => useUi.setState({ scrollTarget: null }), []);
  useReadingPosition({ evaluationKey: evaluation.key, elements, reveal: revealNode });
  useEffect(() => {
    if (!scrollTarget) return;
    if (!revealNode(scrollTarget.id)) return;
    let tries = 0;
    let frame = 0;
    let lastY = window.scrollY;
    let stable = 0;
    const deadline = performance.now() + 5000;
    const focusWhenVisible = () => {
      tracker.current?.measure();
      stable = useUi.getState().visible[scrollTarget.id] && Math.abs(window.scrollY - lastY) < 1 ? stable + 1 : 0;
      lastY = window.scrollY;
      if (stable >= 3) useUi.getState().select(scrollTarget.id);
      else if (performance.now() < deadline) frame = requestAnimationFrame(focusWhenVisible);
    };
    const go = () => {
      const el = elements.get(scrollTarget.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.remove("flash");
        void el.offsetWidth;
        el.classList.add("flash");
        frame = requestAnimationFrame(focusWhenVisible);
      } else if (tries++ < 30) frame = requestAnimationFrame(go);
    };
    frame = requestAnimationFrame(go);
    const cancel = () => cancelAnimationFrame(frame);
    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchmove", cancel, { passive: true });
    return () => {
      cancel();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchmove", cancel);
    };
  }, [scrollTarget, revealNode, elements]);

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
        <Overview evaluation={evaluation} />
        <article className="sheet" data-paper={paper} ref={sheetRef}>
          <div className="spiral" aria-hidden="true" />
          <div className="binder" aria-hidden="true" />
          <MarginLayer nodes={mountedNodes} ruler={ruler} sheet={sheetEl} fill={fillEl} />
          {/* learned shapes' fill: before the header so it paints under the ruled frame (core/learned-shape) */}
          <svg className="shape-layer" ref={fillRef} aria-hidden="true" />
          <header className="head">
            <div className="rows">
              <div className="course">
                {course.data.name}&nbsp;<span>· {evaluation.meta.title}</span>
              </div>
              <div className="topic"><MathText text={currentTopic ? `${topicNumber(currentTopic, curIdx)} — ${currentTopic.title ?? ""}` : content.title} /></div>
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
            <div className="flow hl-root" ref={flowRef}>
              {content.topics.map((t, i) => (
                <TopicSection key={t.id} topic={t} number={topicNumber(t, i)} mounted={mounted.has(t.id)} onNear={() => mount([t.id])} estimateLines={estimateLines(t)} />
              ))}
            </div>
            <svg className="hl-ink" ref={inkRef} aria-hidden="true" style={{ "--marker": markerVar(marker) } as CSSProperties} />
          </section>
        </article>
        <SelectionMenu />
      </div>
    </PageContext.Provider>
  );
}
