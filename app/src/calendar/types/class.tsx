import { Presentation } from "lucide-react";
import { defineEventType } from "../registry";
import { calendarSemesters, holidayDates, weeklyDates } from "../derive";
import { DayItemBase } from "../DayItemBase";
import { useT, type StringKey } from "@/i18n";

/** Recurring classes from course.yaml `schedule` (minus exceptions and semester holidays). */
export default defineEventType({
  type: "class",
  label: "kind.class",
  color: "ev-class",
  icon: Presentation,
  order: 1,
  derive: ({ graph }) =>
    calendarSemesters(graph).flatMap((s) => {
      const holidays = holidayDates(s);
      return s.courses.flatMap((c) =>
        c.data.schedule.flatMap((slot) =>
          weeklyDates(slot.weekday, slot.from, slot.until, new Set([...holidays, ...(slot.exceptions ?? [])])).map((date) => {
            const loc = c.data.locations.find((l) => l.id === slot.location);
            return {
              id: `class:${c.key}/${slot.id}@${date}`,
              type: "class",
              date,
              start: slot.start,
              end: slot.end,
              title: `${slot.label} · ${c.data.name}`,
              location: loc ? [loc.room, loc.campus].filter(Boolean).join(" · ") : slot.location,
              href: `/s/${s.id}/c/${c.id}`,
              courseKey: c.key,
              data: { modality: slot.modality ?? c.data.modality, link: slot.link, staff: slot.staff },
            };
          }),
        ),
      );
    }),
  DayItem: function ClassItem({ event }) {
    const t = useT();
    return (
    <DayItemBase event={event}>
      {(event.data?.modality || event.data?.link || (event.data?.staff as string[] | undefined)?.length) ? (
        <div className="di-meta">
          {event.data?.modality ? <span>{t(`modality.${String(event.data.modality)}` as StringKey)}</span> : null}
          {(event.data?.staff as string[] | undefined)?.length ? <span>{(event.data!.staff as string[]).join(", ")}</span> : null}
          {event.data?.link ? (
            <a href={String(event.data.link)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              link
            </a>
          ) : null}
        </div>
      ) : null}
    </DayItemBase>
    );
  },
});
