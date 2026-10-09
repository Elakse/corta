import type { ContentGraph, Course, Evaluation, Semester } from "@/core/content";
import { eventTypeRegistry, type CalendarEvent, type DeriveContext } from "./registry";
import { addDays, parseDate, toISODate } from "@/views/format";
import { WEEKDAYS } from "@/domain/courses";

/** Semesters the calendar shows: real ones; the sample only when there's nothing else. */
export function calendarSemesters(g: ContentGraph): Semester[] {
  const real = g.semesters.filter((s) => !s.data.sample);
  return real.length ? real : g.semesters;
}

export function calendarCourses(g: ContentGraph): Course[] {
  return calendarSemesters(g).flatMap((s) => s.courses);
}

/** Every derived event, sorted by date, time and type order. */
export function deriveEvents(ctx: DeriveContext): CalendarEvent[] {
  const types = eventTypeRegistry.list();
  const order = new Map(types.map((t) => [t.type, t.order]));
  return types
    .flatMap((t) => t.derive(ctx))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? "") || (order.get(a.type) ?? 0) - (order.get(b.type) ?? 0));
}

/** Dates (YYYY-MM-DD) of a weekly slot between from and until, minus exceptions and holidays. */
export function weeklyDates(weekday: (typeof WEEKDAYS)[number], from: string, until: string, skip: Set<string>): string[] {
  const out: string[] = [];
  let d = parseDate(from);
  const target = WEEKDAYS.indexOf(weekday);
  while ((d.getDay() + 6) % 7 !== target) d = addDays(d, 1);
  const end = parseDate(until);
  for (; d <= end; d = addDays(d, 7)) {
    const iso = toISODate(d);
    if (!skip.has(iso)) out.push(iso);
  }
  return out;
}

export function holidayDates(s: Semester): Set<string> {
  const out = new Set<string>();
  for (const h of s.data.holidays) {
    let d = parseDate(h.date);
    const end = parseDate(h.until ?? h.date);
    for (; d <= end; d = addDays(d, 1)) out.add(toISODate(d));
  }
  return out;
}

export const evaluationEvent = (type: string, c: Course, ev: Evaluation, href?: string): CalendarEvent => ({
  id: `${type}:${ev.key}`,
  type,
  date: ev.meta.date!,
  start: ev.meta.start,
  end: ev.meta.end,
  title: `${ev.meta.title} · ${c.data.name}`,
  subtitle: ev.meta.scope,
  location: c.data.locations.find((l) => l.id === ev.meta.location)?.room ?? ev.meta.location,
  href,
  courseKey: c.key,
  evaluationKey: ev.key,
  data: { passing: ev.meta.passing },
});
