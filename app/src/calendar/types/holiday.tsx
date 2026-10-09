import { PartyPopper } from "lucide-react";
import { defineEventType } from "../registry";
import { calendarSemesters } from "../derive";
import { DayItemBase } from "../DayItemBase";

/** Holidays / breaks from semester.yaml. */
export default defineEventType({
  type: "holiday",
  label: "kind.holiday",
  color: "ev-holiday",
  icon: PartyPopper,
  order: 0,
  derive: ({ graph }) =>
    calendarSemesters(graph).flatMap((s) =>
      s.data.holidays.map((h) => ({ id: `holiday:${s.id}@${h.date}`, type: "holiday", date: h.date, endDate: h.until, title: h.label })),
    ),
  DayItem: ({ event }) => <DayItemBase event={event} />,
});
