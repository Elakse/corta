import { evaluationTree, effectiveWeight, progress } from "@/core/progress";
import { calendarCourses } from "@/calendar/derive";
import { daysBetween } from "@/views/format";
import { defineStrategy, type PriorityCandidate } from "../registry";

/** Content units assumed for an evaluation that has no generated content yet. */
export const UNKNOWN_SIZE = 8;
/** How far ahead to look. */
export const HORIZON_DAYS = 60;

/**
 * remaining work ÷ (days left + planned slack). Each planned study hour before the date adds half a day of slack,
 * so evaluations you've already planned for drop a little. Pure, for testing.
 */
export function pressure(remainingUnits: number, daysLeft: number, plannedHours: number): number {
  return remainingUnits / (Math.max(daysLeft, 0.5) + plannedHours * 0.5);
}

export default defineStrategy({
  id: "deadline-pressure",
  label: "Deadline pressure",
  description: "Upcoming evaluations and submissions scored by remaining weighted content ÷ days left (planned sessions count as slack).",
  rank({ graph, done, sessions, today }) {
    const out: PriorityCandidate[] = [];
    for (const c of calendarCourses(graph)) {
      for (const ev of c.evaluations) {
        const date = ev.meta.date;
        if (!date || date < today) continue;
        const daysLeft = daysBetween(today, date);
        if (daysLeft > HORIZON_DAYS) continue;
        // a retake only matters once the evaluation it retakes has happened
        if (ev.meta.retakes) {
          const orig = c.evaluations.find((e) => e.id === ev.meta.retakes);
          if (orig?.meta.date && orig.meta.date >= today) continue;
        }
        const tree = evaluationTree(ev);
        const remaining = tree ? 1 - progress(tree, done) : null;
        if (remaining !== null && remaining <= 0.001) continue;
        const units = tree ? effectiveWeight(tree) * remaining! : UNKNOWN_SIZE;
        const plannedHours = sessions.filter((s) => s.evaluationKey === ev.key && s.date >= today && s.date <= date).reduce((h, s) => h + s.durationMin / 60, 0);
        out.push({
          evaluationKey: ev.key,
          score: pressure(units, daysLeft, plannedHours),
          daysLeft,
          remaining,
          plannedHours,
          reason:
            remaining === null
              ? { key: "priority.reasonNoContent", params: { days: daysLeft } }
              : { key: "priority.reason", params: { pct: Math.round(remaining * 100), days: daysLeft } },
        });
      }
    }
    return out.sort((a, b) => b.score - a.score);
  },
});
