/**
 * API contract shared by the server (validation) and the app (typed client).
 * Content never goes through the API: the app reads content files; the server stores user state only.
 */
import { z } from "zod";

export const ProgressChange = z.object({ set: z.array(z.string()).default([]), unset: z.array(z.string()).default([]) });
export type ProgressChange = z.infer<typeof ProgressChange>;
export const ProgressState = z.object({ done: z.array(z.string()) });
export type ProgressState = z.infer<typeof ProgressState>;

export const ProgressEvent = z.object({ nodeId: z.string(), done: z.boolean(), at: z.string() });
export type ProgressEvent = z.infer<typeof ProgressEvent>;

export const SettingValue = z.object({ value: z.unknown() });

export const StudySessionInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMin: z.number().int().positive().max(24 * 60),
  courseKey: z.string(),
  evaluationKey: z.string().nullable().optional(),
  topicId: z.string().nullable().optional(),
  goal: z.string().max(500).nullable().optional(),
  done: z.boolean().optional(),
});
export type StudySessionInput = z.infer<typeof StudySessionInput>;
export const StudySession = StudySessionInput.extend({ id: z.string(), createdAt: z.string(), updatedAt: z.string() });
export type StudySession = z.infer<typeof StudySession>;

export const Annotation = z.object({ nodeId: z.string(), text: z.string(), updatedAt: z.string() });
export type Annotation = z.infer<typeof Annotation>;

/** A calendar event as derived by the app (from content + state), pushed one-way to Google Calendar. */
export const SyncEvent = z.object({
  /** stable entity id, e.g. class:2026-C2/pdp/teorica@2026-10-14 */
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  /** all-day events: date only; timed events: start/end ISO local date-times */
  allDay: z.boolean(),
  date: z.string(),
  endDate: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  colorHint: z.string().optional(),
});
export type SyncEvent = z.infer<typeof SyncEvent>;
export const SyncRequest = z.object({ events: z.array(SyncEvent), timeZone: z.string() });
export type SyncRequest = z.infer<typeof SyncRequest>;
export const SyncResult = z.object({ created: z.number(), updated: z.number(), deleted: z.number(), calendarId: z.string() });
export type SyncResult = z.infer<typeof SyncResult>;
export const GcalStatus = z.object({ configured: z.boolean(), connected: z.boolean(), calendarId: z.string().nullable(), lastSync: z.string().nullable() });
export type GcalStatus = z.infer<typeof GcalStatus>;

/** Images the tutor can look at (a photo of the sheet on the desk, a pasted screenshot…). */
export const CHAT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_CHAT_IMAGES = 3;
/** Base64 cap per image. The app downsizes to ~1600px JPEG (a few hundred KB), far below this. */
export const MAX_CHAT_IMAGE_BASE64 = 6_000_000;

/** LLM chat (provider-agnostic). Tools come from the app's action registry. */
export const ChatContentBlock = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image"), mediaType: z.enum(CHAT_IMAGE_TYPES), /** base64, no `data:` prefix */ data: z.string().min(1).max(MAX_CHAT_IMAGE_BASE64) }),
  z.object({ type: z.literal("tool_use"), id: z.string(), name: z.string(), input: z.unknown() }),
  z.object({ type: z.literal("tool_result"), tool_use_id: z.string(), content: z.string(), is_error: z.boolean().optional() }),
]);
export type ChatContentBlock = z.infer<typeof ChatContentBlock>;
export const ChatMessage = z.object({ role: z.enum(["user", "assistant"]), content: z.union([z.string(), z.array(ChatContentBlock)]) })
  .refine((m) => typeof m.content === "string" || m.content.filter((b) => b.type === "image").length <= MAX_CHAT_IMAGES, { message: `at most ${MAX_CHAT_IMAGES} images per message` });
export type ChatMessage = z.infer<typeof ChatMessage>;
export const ChatTool = z.object({ name: z.string(), description: z.string(), input_schema: z.record(z.string(), z.unknown()) });
export type ChatTool = z.infer<typeof ChatTool>;
export const LlmSelection = z.object({ provider: z.string().min(1).max(80), model: z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9_.:/-]+$/) });
export type LlmSelection = z.infer<typeof LlmSelection>;
export const ChatRequest = z.object({ system: z.string(), messages: z.array(ChatMessage), tools: z.array(ChatTool).default([]), sessionId: z.string().uuid().optional(), provider: LlmSelection.shape.provider.optional(), model: LlmSelection.shape.model.optional() });
export type ChatRequest = z.infer<typeof ChatRequest>;
export const LlmStatus = z.object({ configured: z.boolean(), provider: z.string(), model: z.string() });
export type LlmStatus = z.infer<typeof LlmStatus>;
export interface LlmConfiguration {
  selection: LlmSelection;
  models: Record<string, string>;
  providers: { id: string; label: string; configured: boolean; defaultModel: string; models: string[] }[];
}

/** Machine-readable reasons the app can explain in its own language (everything else shows `message`). */
export type ChatErrorCode = "images_unsupported";

/** Server-sent events of a chat stream. */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string; code?: ChatErrorCode };

/** Course source material (read-only): search hits and extracted pages, for tracing content back to its origin. */
export interface SourceHit {
  ref: string;
  title: string;
  short: string;
  page: number;
  score: number;
  excerpt: string;
}
export interface SourcePage {
  ref: string;
  title: string;
  short: string;
  page: number;
  pages: number;
  text: string;
}
