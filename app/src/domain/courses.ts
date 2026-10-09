/** Small derived views over content used by several screens (nothing stored; computed from the graph). */
import type { Course, Evaluation, Semester, ContentGraph } from "@/core/content";
import { todayISO } from "@/views/format";

export const evaluationUrl = (ev: Evaluation) => {
  const [s, c] = ev.key.split("/");
  return `/s/${s}/c/${c}/e/${ev.id}`;
};
export const courseUrl = (c: Course) => `/s/${c.semesterId}/c/${c.id}`;
export const semesterUrl = (s: Semester) => `/s/${s.id}`;

/** Upcoming evaluations of a course (today or later), soonest first. */
export function upcomingEvaluations(c: Course, today = todayISO()): Evaluation[] {
  return c.evaluations.filter((e) => e.meta.date && e.meta.date >= today).sort((a, b) => (a.meta.date! < b.meta.date! ? -1 : 1));
}

/** The semester Home shows: the active one, else the one containing today, else the latest non-sample. */
export function currentSemester(g: ContentGraph, today = todayISO()): Semester | undefined {
  const real = g.semesters.filter((s) => !s.data.sample);
  return (
    real.find((s) => s.data.active) ??
    real.find((s) => s.data.start <= today && today <= s.data.end) ??
    real[0] ??
    g.semesters[0]
  );
}

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
