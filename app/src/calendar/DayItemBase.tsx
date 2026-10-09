import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { eventTypeRegistry, type CalendarEvent } from "./registry";
import { useT } from "@/i18n";

/** Shared layout for day-panel items: colored rail, time, title, details, and a link to the real entity. */
export function DayItemBase({ event, children, action }: { event: CalendarEvent; children?: ReactNode; action?: ReactNode }) {
  const t = useT();
  const def = eventTypeRegistry.get(event.type);
  const Icon = def?.icon;
  const body = (
    <>
      <div className="di-head">
        {Icon && <Icon size={15} />}
        <span className="di-kind">{def ? t(def.label) : event.type}</span>
        {event.start && (
          <span className="di-time">
            {event.start}
            {event.end ? `–${event.end}` : ""}
          </span>
        )}
      </div>
      <div className="di-title">{event.title}</div>
      {(event.subtitle || event.location) && <div className="di-sub">{[event.subtitle, event.location].filter(Boolean).join(" · ")}</div>}
      {children}
    </>
  );
  return (
    <article className="day-item" style={{ ["--c" as string]: `var(--${def?.color ?? "ink-soft"})` }}>
      {event.href ? (
        <Link to={event.href} className="di-link">
          {body}
          <ArrowUpRight size={16} className="di-arrow" />
        </Link>
      ) : (
        <div className="di-link">{body}</div>
      )}
      {action}
    </article>
  );
}
