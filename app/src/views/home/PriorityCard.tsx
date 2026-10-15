import { useMemo } from "react";
import { Link } from "react-router";
import { useGraph } from "@/core/content";
import { DEFAULT_STRATEGY, strategyRegistry } from "@/priority";
import { useProgress } from "@/state/progress";
import { useSessions } from "@/state/sessions";
import { useSetting } from "@/state/settings";
import { evaluationUrl, courseUrl } from "@/domain/courses";
import { useLocale, useT } from "@/i18n";
import { fmtDate, todayISO } from "../format";

/** "What's probably best to do next", from the active priority strategy. */
export function PriorityCard() {
  const t = useT();
  const locale = useLocale();
  const graph = useGraph();
  const done = useProgress((s) => s.done);
  const sessions = useSessions((s) => s.items);
  const [strategyId] = useSetting("priority.strategy", DEFAULT_STRATEGY);
  const top = useMemo(() => {
    const strategy = strategyRegistry.get(strategyId) ?? strategyRegistry.require(DEFAULT_STRATEGY);
    return strategy.rank({ graph, done, sessions, today: todayISO() })[0];
  }, [graph, done, sessions, strategyId]);
  if (!top) {
    return (
      <section className="prio-card">
        <div className="eyebrow">{t("home.next")}</div>
        <p className="prio-none">{t("priority.none")}</p>
      </section>
    );
  }
  const ev = graph.evaluations.get(top.evaluationKey)!;
  const course = graph.courses.get(top.evaluationKey.split("/").slice(0, 2).join("/"))!;
  const href = ev.content ? evaluationUrl(ev) : courseUrl(course);
  return (
    <Link to={href} className="prio-card home-card-link" aria-label={`${t("priority.go")}: ${ev.meta.title}`}>
      <div className="prio-glow" aria-hidden="true" />
      <div className="eyebrow">{t("home.next")}</div>
      <div className="prio-body">
        <div className="prio-count">
          <b>{top.daysLeft}</b>
          <span>{top.daysLeft === 1 ? t("priority.tomorrow") : top.daysLeft === 0 ? t("priority.today") : t("priority.days")}</span>
        </div>
        <div className="prio-what">
          <h3>{ev.meta.title}</h3>
          <div className="prio-course">
            {course.data.name} · {fmtDate(ev.meta.date!, locale)}
          </div>
          <p className="prio-reason">
            {t(top.reason.key, top.reason.params)}
            {top.plannedHours > 0 && <> · {t("priority.planned", { h: Math.round(top.plannedHours * 10) / 10 })}</>}
          </p>
        </div>
      </div>
      {top.remaining !== null && (
        <div className="prio-bar">
          <i style={{ width: `${(1 - top.remaining) * 100}%` }} />
        </div>
      )}
    </Link>
  );
}
