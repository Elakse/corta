import { eventTypeRegistry, type CalendarEvent } from "@/calendar";
import { useLocale, useT } from "@/i18n";
import { addDays, toISODate } from "../format";

const MAX = 3;

export function MonthGrid({ cursor, days, today, selected, onSelect }: { cursor: Date; days: Map<string, CalendarEvent[]>; today: string; selected: string | null; onSelect: (d: string) => void }) {
  const t = useT();
  useLocale();
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weekdays = t("weekday.short").split(",");
  return (
    <div className="month">
      {weekdays.map((w) => (
        <div key={w} className="wd">
          {w}
        </div>
      ))}
      {cells.map((d) => {
        const iso = toISODate(d);
        const list = days.get(iso) ?? [];
        const out = d.getMonth() !== cursor.getMonth();
        const holiday = list.some((e) => e.type === "holiday");
        const keyEv = list.find((e) => eventTypeRegistry.get(e.type)?.key);
        const shown = list.filter((e) => e.type !== "holiday").slice(0, MAX);
        const more = list.filter((e) => e.type !== "holiday").length - shown.length;
        return (
          <button
            key={iso}
            type="button"
            className="day"
            data-out={out || undefined}
            data-today={iso === today || undefined}
            data-selected={iso === selected || undefined}
            data-holiday={holiday || undefined}
            data-past={iso < today || undefined}
            style={keyEv ? { ["--k" as string]: `var(--${eventTypeRegistry.get(keyEv.type)!.color})` } : undefined}
            data-key={keyEv ? true : undefined}
            onClick={() => onSelect(iso)}
            aria-label={iso}
          >
            <span className="dn">{d.getDate()}</span>
            {holiday && <span className="hol">{list.find((e) => e.type === "holiday")!.title}</span>}
            <span className="evs">
              {shown.map((e) => {
                const def = eventTypeRegistry.get(e.type);
                return (
                  <span key={e.id} className="ev" data-key={def?.key || undefined} style={{ ["--c" as string]: `var(--${def?.color ?? "ink-soft"})` }}>
                    {e.start && <b>{e.start}</b>}
                    {e.title}
                  </span>
                );
              })}
              {more > 0 && <span className="more">+{more}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
