import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { CalendarClock, MapPin } from "lucide-react";
import { useGraph, type Course } from "@/core/content";
import { courseTree, evaluationTree, semesterTree } from "@/core/progress";
import { useTreeProgress } from "@/state/node-progress";
import { colorForEvaluationKind } from "@/calendar";
import { courseUrl, upcomingEvaluations } from "@/domain/courses";
import { ProgressBar, ProgressRing } from "@/ui/Progress";
import { relativeDay } from "@/ui/when";
import { useLocale, useT } from "@/i18n";
import { fmtDate, todayISO } from "../format";
import { NotFound } from "../shell/NotFound";

function EvalLine({ course, i }: { course: Course; i: number }) {
  const ev = course.evaluations[i]!;
  const locale = useLocale();
  const p = useTreeProgress(evaluationTree(ev));
  const past = ev.meta.date ? ev.meta.date < todayISO() : false;
  return (
    <li className="cc-eval" data-past={past || undefined} style={{ ["--c" as string]: `var(--${colorForEvaluationKind(ev.meta.kind)})` }}>
      <i className="dot" />
      <span className="cc-eval-title">{ev.meta.title}</span>
      <span className="cc-eval-date">{ev.meta.date ? fmtDate(ev.meta.date, locale, { day: "numeric", month: "short" }) : "—"}</span>
      {ev.content ? <ProgressBar value={p} className="mini" /> : <span className="cc-nocontent" />}
    </li>
  );
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  const t = useT();
  const locale = useLocale();
  const p = useTreeProgress(courseTree(course));
  const next = upcomingEvaluations(course)[0];
  const weekdays = t("weekday.short").split(",");
  const WD = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.07 * index, ease: [0.2, 0.8, 0.2, 1] }} className="mason-item">
      <Link to={courseUrl(course)} className="course-card">
        <div className="cc-top">
          <div>
            {course.data.code && <div className="eyebrow">{course.data.code}</div>}
            <h2>{course.data.name}</h2>
          </div>
          <ProgressRing value={p} size={64} stroke={5} />
        </div>
        {next && (
          <div className="cc-next" style={{ ["--c" as string]: `var(--${colorForEvaluationKind(next.meta.kind)})` }}>
            <span className="cc-next-when">{relativeDay(next.meta.date!, locale)}</span>
            <span className="cc-next-what">{next.meta.title}</span>
          </div>
        )}
        <ul className="cc-evals">
          {course.evaluations.map((_, i) => (
            <EvalLine key={i} course={course} i={i} />
          ))}
        </ul>
        {course.data.schedule.length > 0 && (
          <ul className="cc-sched">
            {course.data.schedule.map((s) => (
              <li key={s.id}>
                <CalendarClock size={14} />
                <span>
                  {weekdays[WD.indexOf(s.weekday)]} {s.start}–{s.end}
                </span>
                <span className="muted">{s.label}</span>
                {s.location && (
                  <span className="muted">
                    <MapPin size={12} /> {course.data.locations.find((l) => l.id === s.location)?.room ?? s.location}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Link>
    </motion.div>
  );
}

/** A semester: its courses as cards in a masonry layout, sized by what they contain. */
export default function SemesterPage() {
  const { semester: id } = useParams();
  const t = useT();
  const locale = useLocale();
  const sem = useGraph().semesters.find((s) => s.id === id);
  const p = useTreeProgress(sem ? semesterTree(sem) : undefined);
  if (!sem) return <NotFound />;
  return (
    <div className="page-pad page-wide">
      <header className="page-hero">
        <div>
          <div className="eyebrow">
            {t("semester.courses", { n: sem.courses.length })}
            {sem.data.sample && <em className="sample-tag"> · {t("sample")}</em>}
          </div>
          <h1>{sem.data.label}</h1>
          <div className="hero-sub">
            {fmtDate(sem.data.start, locale, { day: "numeric", month: "long" })} → {fmtDate(sem.data.end, locale, { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <ProgressRing value={p} size={112} />
      </header>
      <div className="masonry">
        {sem.courses.map((c, i) => (
          <CourseCard key={c.key} course={c} index={i} />
        ))}
      </div>
    </div>
  );
}
