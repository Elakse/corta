import { BookOpenCheck, Pencil } from "lucide-react";
import { defineEventType, type CalendarEvent } from "../registry";
import { DayItemBase } from "../DayItemBase";
import { useUi } from "@/state/ui";
import { useT } from "@/i18n";
import { evaluationUrl } from "@/domain/courses";

const addMinutes = (hhmm: string, min: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const t = Math.min(23 * 60 + 59, h! * 60 + m! + min);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

function SessionItem({ event }: { event: CalendarEvent }) {
  const t = useT();
  const edit = useUi((s) => s.editSession);
  return (
    <DayItemBase
      event={event}
      action={
        <button type="button" className="icon-btn di-edit" aria-label={t("session.edit")} onClick={() => edit(event.sessionId!)}>
          <Pencil size={15} />
        </button>
      }
    >
      {event.data?.goal ? <div className="di-goal">“{String(event.data.goal)}”</div> : null}
    </DayItemBase>
  );
}

/** Planned study sessions (user state from SQLite). */
export default defineEventType({
  type: "study-session",
  label: "kind.study-session",
  color: "ev-session",
  icon: BookOpenCheck,
  order: 4,
  derive: ({ graph, sessions }) =>
    sessions.map((s) => {
      const course = graph.courses.get(s.courseKey);
      const ev = s.evaluationKey ? graph.evaluations.get(s.evaluationKey) : undefined;
      const topic = s.topicId ? graph.nodes.get(s.topicId)?.node : undefined;
      return {
        id: `session:${s.id}`,
        type: "study-session",
        date: s.date,
        start: s.start,
        end: addMinutes(s.start, s.durationMin),
        title: [ev?.meta.title, course?.data.name].filter(Boolean).join(" · ") || "—",
        subtitle: topic?.title,
        href: ev?.content ? evaluationUrl(ev) : course ? `/s/${course.semesterId}/c/${course.id}` : undefined,
        courseKey: s.courseKey,
        evaluationKey: s.evaluationKey ?? undefined,
        sessionId: s.id,
        data: { goal: s.goal, durationMin: s.durationMin, topicId: s.topicId },
      };
    }),
  DayItem: SessionItem,
});
