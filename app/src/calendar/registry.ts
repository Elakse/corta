import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { StudySession } from "@shared/api";
import type { ContentGraph, EvaluationKind } from "@/core/content";
import { createRegistry } from "@/core/registry";
import type { ColorToken } from "@/theme";
import type { StringKey } from "@/i18n";

/** A calendar entry. Always derived (from content + state), never stored. `id` is a stable entity id. */
export interface CalendarEvent {
  id: string;
  type: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // multi-day all-day events (inclusive)
  start?: string; // HH:MM (timed events)
  end?: string;
  title: string;
  subtitle?: string;
  location?: string;
  /** route of the real entity (course, evaluation page…) */
  href?: string;
  courseKey?: string;
  evaluationKey?: string;
  sessionId?: string;
  /** type-specific payload for the day panel renderer */
  data?: Record<string, unknown>;
}

export interface DeriveContext {
  graph: ContentGraph;
  sessions: StudySession[];
}

export interface EventTypeDef {
  type: string;
  label: StringKey;
  color: ColorToken;
  icon: LucideIcon;
  /** lower = drawn first within a day */
  order: number;
  /** evaluation kinds this type represents (lets other screens color evaluations consistently) */
  evaluationKinds?: EvaluationKind[];
  /** "is this a key date?" (exams, submissions): used by "jump to" and emphasis */
  key?: boolean;
  /** include in the Google Calendar push (default true) */
  sync?: boolean;
  derive: (ctx: DeriveContext) => CalendarEvent[];
  /** how the day panel shows one event of this type */
  DayItem: ComponentType<{ event: CalendarEvent }>;
}

export const eventTypeRegistry = createRegistry<EventTypeDef>("calendar event types", (d) => d.type);
export const defineEventType = (d: EventTypeDef) => d;

export function colorForEvaluationKind(kind: EvaluationKind): ColorToken {
  return eventTypeRegistry.list().find((t) => t.evaluationKinds?.includes(kind))?.color ?? "ink-soft";
}
