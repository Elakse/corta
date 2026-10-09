import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import type { Semester } from "@/core/content";
import { courseTree, semesterTree } from "@/core/progress";
import { useTreeProgress } from "@/state/node-progress";
import { courseUrl, semesterUrl, upcomingEvaluations } from "@/domain/courses";
import { colorForEvaluationKind } from "@/calendar";
import { ProgressBar, ProgressRing } from "@/ui/Progress";
import { relativeDay } from "@/ui/when";
import { useLocale, useT } from "@/i18n";
import { fmtDate } from "../format";
import type { Course } from "@/core/content";

function CourseRow({ course }: { course: Course }) {
  const locale = useLocale();
  const p = useTreeProgress(courseTree(course));
  const next = upcomingEvaluations(course)[0];
  return (
    <Link to={courseUrl(course)} className="sc-course">
      <span className="sc-name">{course.data.name}</span>
      <ProgressBar value={p} />
      <span className="sc-pct">{Math.round(p * 100)}%</span>
      {next ? (
        <span className="sc-next" style={{ ["--c" as string]: `var(--${colorForEvaluationKind(next.meta.kind)})` }}>
          {next.meta.title} · {relativeDay(next.meta.date!, locale)}
        </span>
      ) : (
        <span />
      )}
    </Link>
  );
}

export function SemesterCard({ semester }: { semester: Semester }) {
  const t = useT();
  const locale = useLocale();
  const p = useTreeProgress(semesterTree(semester));
  return (
    <section className="card-surface sem-card">
      <div className="sem-main">
        <div className="eyebrow">
          {t("home.semester")}
          {semester.data.sample && <em className="sample-tag">· {t("sample")}</em>}
        </div>
        <Link to={semesterUrl(semester)} className="sem-title">
          {semester.data.label}
          <ArrowUpRight size={22} />
        </Link>
        <div className="sem-dates">
          {fmtDate(semester.data.start, locale, { day: "numeric", month: "short" })} → {fmtDate(semester.data.end, locale, { day: "numeric", month: "short", year: "numeric" })}
        </div>
        <div className="sc-list">
          {semester.courses.map((c) => (
            <CourseRow key={c.key} course={c} />
          ))}
        </div>
      </div>
      <ProgressRing value={p} size={128} />
    </section>
  );
}
