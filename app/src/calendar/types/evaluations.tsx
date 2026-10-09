import { FileCheck2, GraduationCap, PenLine, RotateCcw } from "lucide-react";
import type { EvaluationKind } from "@/core/content";
import { evaluationTree } from "@/core/progress";
import { useTreeProgress } from "@/state/node-progress";
import { useGraph } from "@/core/content";
import { ProgressBar } from "@/ui/Progress";
import { defineEventType, type CalendarEvent, type EventTypeDef } from "../registry";
import { calendarCourses, evaluationEvent } from "../derive";
import { DayItemBase } from "../DayItemBase";
import { evaluationUrl } from "@/domain/courses";

function EvaluationItem({ event }: { event: CalendarEvent }) {
  const ev = useGraph().evaluations.get(event.evaluationKey ?? "");
  const p = useTreeProgress(ev ? evaluationTree(ev) : undefined);
  return (
    <DayItemBase event={event}>
      {event.data?.passing ? <div className="di-meta">{String(event.data.passing)}</div> : null}
      {ev?.content && (
        <div className="di-progress">
          <ProgressBar value={p} />
          <span>{Math.round(p * 100)}%</span>
        </div>
      )}
    </DayItemBase>
  );
}

const evaluationType = (type: string, kinds: EvaluationKind[], def: Pick<EventTypeDef, "label" | "color" | "icon" | "order">) =>
  defineEventType({
    type,
    ...def,
    key: true,
    evaluationKinds: kinds,
    derive: ({ graph }) =>
      calendarCourses(graph).flatMap((c) =>
        c.evaluations.filter((e) => kinds.includes(e.meta.kind) && e.meta.date).map((e) => evaluationEvent(type, c, e, e.content ? evaluationUrl(e) : `/s/${c.semesterId}/c/${c.id}`)),
      ),
    DayItem: EvaluationItem,
  });

/** Exams and deliverables from course.yaml `evaluations` (one event type per kind family). */
export default [
  evaluationType("midterm", ["midterm"], { label: "kind.midterm", color: "ev-midterm", icon: PenLine, order: 3 }),
  evaluationType("retake", ["retake"], { label: "kind.retake", color: "ev-retake", icon: RotateCcw, order: 3 }),
  evaluationType("final", ["final"], { label: "kind.final", color: "ev-final", icon: GraduationCap, order: 3 }),
  evaluationType("submission", ["assignment", "submission"], { label: "kind.submission", color: "ev-submission", icon: FileCheck2, order: 2 }),
];
