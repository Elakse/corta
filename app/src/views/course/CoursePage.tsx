import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, BookMarked, ExternalLink, MapPin, Users, Clock } from "lucide-react";
import { useGraph, type Course, type Evaluation } from "@/core/content";
import { courseTree, evaluationTree } from "@/core/progress";
import { useTreeProgress } from "@/state/node-progress";
import { colorForEvaluationKind, eventTypeRegistry } from "@/calendar";
import { evaluationUrl } from "@/domain/courses";
import { ProgressBar, ProgressRing } from "@/ui/Progress";
import { relativeDay } from "@/ui/when";
import { intlLocale, useLocale, useT } from "@/i18n";
import { parseDate, todayISO } from "../format";
import { NotFound } from "../shell/NotFound";

function EvaluationRow({ ev, index }: { ev: Evaluation; index: number }) {
  const t = useT();
  const locale = useLocale();
  const p = useTreeProgress(evaluationTree(ev));
  const date = ev.meta.date ? parseDate(ev.meta.date) : null;
  const past = ev.meta.date ? ev.meta.date < todayISO() : false;
  const type = eventTypeRegistry.list().find((x) => x.evaluationKinds?.includes(ev.meta.kind));
  return (
    <motion.li
      className="ev-row"
      data-past={past || undefined}
      style={{ ["--c" as string]: `var(--${colorForEvaluationKind(ev.meta.kind)})` }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.06 * index, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="ev-date">
        {date ? (
          <>
            <b>{date.getDate()}</b>
            <span>{new Intl.DateTimeFormat(intlLocale(locale), { month: "short" }).format(date)}</span>
          </>
        ) : (
          <b>—</b>
        )}
      </div>
      <div className="ev-main">
        <div className="ev-kind">
          {type ? t(type.label) : ev.meta.kind}
          {ev.meta.date && !past && <span className="ev-when"> · {relativeDay(ev.meta.date, locale)}</span>}
          {ev.meta.start && (
            <span className="ev-when">
              {" "}
              · {ev.meta.start}
              {ev.meta.end ? `–${ev.meta.end}` : ""}
            </span>
          )}
        </div>
        <h3>{ev.meta.title}</h3>
        {ev.meta.scope && <p className="ev-scope">{ev.meta.scope}</p>}
        {ev.meta.passing && <p className="ev-pass">{ev.meta.passing}</p>}
        {ev.content ? (
          <div className="ev-progress">
            <ProgressBar value={p} />
            <span>{Math.round(p * 100)}%</span>
            <Link to={evaluationUrl(ev)} className="ev-go">
              {t("course.open")} <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <p className="ev-nocontent">{t("course.noContent")}</p>
        )}
      </div>
    </motion.li>
  );
}

function Info({ course }: { course: Course }) {
  const t = useT();
  const d = course.data;
  const WD = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const weekdays = t("weekday.short").split(",");
  return (
    <aside className="course-info">
      {d.staff.length > 0 && (
        <section>
          <h4>
            <Users size={15} /> {t("course.staff")}
          </h4>
          <ul>
            {d.staff.map((s) => (
              <li key={s.name}>
                <span>{s.name}</span>
                <span className="muted">{[s.role, s.contact].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {d.schedule.length > 0 && (
        <section>
          <h4>
            <Clock size={15} /> {t("course.schedule")}
          </h4>
          <ul>
            {d.schedule.map((s) => {
              const loc = d.locations.find((l) => l.id === s.location);
              return (
                <li key={s.id}>
                  <span>
                    {weekdays[WD.indexOf(s.weekday)]} {s.start}–{s.end} · {s.label}
                  </span>
                  <span className="muted">
                    {[loc ? [loc.room, loc.campus].filter(Boolean).join(", ") : s.location, (s.modality ?? d.modality) && t(`modality.${s.modality ?? d.modality!}`)].filter(Boolean).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {d.locations.length > 0 && (
        <section>
          <h4>
            <MapPin size={15} /> {t("course.locations")}
          </h4>
          <ul>
            {d.locations.map((l) => (
              <li key={l.id}>
                <span>{[l.campus, l.room].filter(Boolean).join(" · ")}</span>
                {l.address && <span className="muted">{l.address}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {d.links.length > 0 && (
        <section>
          <h4>
            <ExternalLink size={15} /> {t("course.links")}
          </h4>
          <ul>
            {d.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {d.bibliography.length > 0 && (
        <section>
          <h4>
            <BookMarked size={15} /> {t("course.bibliography")}
          </h4>
          <ul>
            {d.bibliography.map((b) => (
              <li key={b}>
                <span>{course.sources.get(b)?.title ?? b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

/** A course: what it takes to pass (its evaluations, with dates and progress) and its general info. */
export default function CoursePage() {
  const { semester, course: id } = useParams();
  const t = useT();
  const course = useGraph().courses.get(`${semester}/${id}`);
  const p = useTreeProgress(course ? courseTree(course) : undefined);
  if (!course) return <NotFound />;
  const d = course.data;
  return (
    <div className="page-pad page-wide">
      <header className="page-hero">
        <div>
          <div className="eyebrow">{[d.code, d.modality && t(`modality.${d.modality}`)].filter(Boolean).join(" · ")}</div>
          <h1>{d.name}</h1>
          {d.promotion && <p className="hero-sub promo">{d.promotion}</p>}
        </div>
        <ProgressRing value={p} size={112} />
      </header>
      <div className="course-grid">
        <section>
          <h2 className="section-title">{t("course.toPass")}</h2>
          <ol className="ev-list">
            {course.evaluations.map((ev, i) => (
              <EvaluationRow key={ev.key} ev={ev} index={i} />
            ))}
          </ol>
        </section>
        <Info course={course} />
      </div>
    </div>
  );
}
