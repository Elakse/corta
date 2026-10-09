import { useEffect, useRef } from "react";
import { eventTypeRegistry, type CalendarEvent } from "@/calendar";
import { useLocale, useT } from "@/i18n";
import { addDays, toISODate } from "../format";

const FROM = 7, TO = 24, HOUR = 46;
const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

export function WeekGrid({ start, days, today, selected, onSelect }: { start: Date; days: Map<string, CalendarEvent[]>; today: string; selected: string | null; onSelect: (d: string) => void }) {
  const t = useT();
  useLocale();
  const weekdays = t("weekday.short").split(",");
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: (9 - FROM) * HOUR });
  }, []);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="week">
      <div className="week-head">
        <div />
        {dates.map((d, i) => {
          const iso = toISODate(d);
          const allDay = (days.get(iso) ?? []).filter((e) => !e.start);
          return (
            <button key={iso} className="wh" data-today={iso === today || undefined} data-selected={iso === selected || undefined} onClick={() => onSelect(iso)}>
              <span className="wh-wd">{weekdays[i]}</span>
              <span className="wh-dn">{d.getDate()}</span>
              {allDay.map((e) => (
                <span key={e.id} className="wh-all" style={{ ["--c" as string]: `var(--${eventTypeRegistry.get(e.type)?.color ?? "ink-soft"})` }}>
                  {e.title}
                </span>
              ))}
            </button>
          );
        })}
      </div>
      <div className="week-body" ref={scroller}>
        <div className="week-grid" style={{ height: (TO - FROM) * HOUR }}>
          <div className="hours">
            {Array.from({ length: TO - FROM }, (_, i) => (
              <span key={i} style={{ top: i * HOUR }}>
                {String(FROM + i).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {dates.map((d) => {
            const iso = toISODate(d);
            const timed = (days.get(iso) ?? []).filter((e) => e.start);
            return (
              <div key={iso} className="wcol" data-today={iso === today || undefined} onClick={() => onSelect(iso)}>
                {timed.map((e) => {
                  const top = ((mins(e.start!) - FROM * 60) / 60) * HOUR;
                  const h = Math.max(22, ((mins(e.end ?? e.start!) - mins(e.start!)) / 60) * HOUR - 3);
                  const def = eventTypeRegistry.get(e.type);
                  return (
                    <div key={e.id} className="wev" data-key={def?.key || undefined} style={{ top, height: h, ["--c" as string]: `var(--${def?.color ?? "ink-soft"})` }}>
                      <b>
                        {e.start}
                        {e.end ? `–${e.end}` : ""}
                      </b>
                      <span>{e.title}</span>
                    </div>
                  );
                })}
                {iso === today && nowMin >= FROM * 60 && <div className="now" style={{ top: ((nowMin - FROM * 60) / 60) * HOUR }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
