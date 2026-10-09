import type { StudySession } from "@shared/api";
import type { ContentGraph } from "@/core/content";
import { createRegistry } from "@/core/registry";
import type { Flags } from "@/core/progress";
import type { StringKey } from "@/i18n";

export interface PriorityContext {
  graph: ContentGraph;
  done: Flags;
  sessions: StudySession[];
  today: string;
}

export interface PriorityCandidate {
  evaluationKey: string;
  score: number;
  daysLeft: number;
  /** fraction of the evaluation still to learn (null when it has no content yet) */
  remaining: number | null;
  plannedHours: number;
  /** one-line reason, as an i18n key + params */
  reason: { key: StringKey; params: Record<string, string | number> };
}

/** A "what should I do next" algorithm. Adding one = a file in strategies/. */
export interface PriorityStrategy {
  id: string;
  label: string;
  description: string;
  rank: (ctx: PriorityContext) => PriorityCandidate[];
}

export const strategyRegistry = createRegistry<PriorityStrategy>("priority strategies", (s) => s.id);
export const defineStrategy = (s: PriorityStrategy) => s;
export const DEFAULT_STRATEGY = "deadline-pressure";
