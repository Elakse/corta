import type { SyncEvent } from "@shared/api";
import { api } from "@/api/client";
import { toast } from "@/state/toast";
import { translate } from "@/i18n";
import { eventTypeRegistry, type CalendarEvent } from "./registry";

/** Converts derived events to the one-way push payload (only types with sync !== false). */
export function toSyncEvents(events: CalendarEvent[]): SyncEvent[] {
  return events
    .filter((e) => eventTypeRegistry.get(e.type)?.sync !== false)
    .map((e) => ({
      id: e.id,
      title: e.title,
      description: [e.subtitle, e.href ? `Corta: ${location.origin}${e.href}` : undefined].filter(Boolean).join("\n") || undefined,
      location: e.location,
      allDay: !e.start,
      date: e.date,
      endDate: e.endDate,
      start: e.start,
      end: e.end ?? e.start,
      colorHint: eventTypeRegistry.get(e.type)?.color,
    }));
}

/** Connect (OAuth redirect) or push. Returns true when a sync ran. */
export async function syncToGoogle(events: CalendarEvent[]): Promise<boolean> {
  const status = await api.gcal.status().catch(() => null);
  if (!status?.configured) {
    toast(translate("cal.syncSetup"), "info", 6500);
    return false;
  }
  if (!status.connected) {
    window.location.href = api.gcal.authUrl;
    return false;
  }
  try {
    const r = await api.gcal.sync({ events: toSyncEvents(events), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    toast(translate("cal.synced", { c: r.created, u: r.updated, d: r.deleted }), "success");
    return true;
  } catch (e) {
    toast(translate("cal.syncError", { msg: e instanceof Error ? e.message : String(e) }), "error", 6500);
    return false;
  }
}
