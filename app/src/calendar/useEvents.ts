import { useMemo } from "react";
import { useGraph } from "@/core/content";
import { useSessions } from "@/state/sessions";
import { deriveEvents } from "./derive";
import type { CalendarEvent } from "./registry";

/** All calendar events, derived from content + sessions; recomputed only when either changes. */
export function useCalendarEvents(): CalendarEvent[] {
  const graph = useGraph();
  const sessions = useSessions((s) => s.items);
  return useMemo(() => deriveEvents({ graph, sessions }), [graph, sessions]);
}

/** Events by day (multi-day events appear on every day they cover). */
export function byDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  const push = (d: string, e: CalendarEvent) => map.set(d, [...(map.get(d) ?? []), e]);
  for (const e of events) {
    if (!e.endDate) push(e.date, e);
    else {
      const [y, m, d] = e.date.split("-").map(Number);
      for (let t = new Date(y!, m! - 1, d!); ; t.setDate(t.getDate() + 1)) {
        const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
        push(iso, e);
        if (iso >= e.endDate) break;
      }
    }
  }
  return map;
}
