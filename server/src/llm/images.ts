import type { ChatErrorCode, ChatRequest } from "../../../shared/api";

/** A failure the app can explain in its own language: `code` is sent to the browser next to `message`. */
export class ChatError extends Error {
  constructor(message: string, readonly code?: ChatErrorCode) {
    super(message);
  }
}

export const IMAGES_UNSUPPORTED = "This model could not process the attached images. Pick a model that accepts images in Settings.";

export function hasImages(req: ChatRequest): boolean {
  return req.messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === "image"));
}

/**
 * Providers answer 400/404/415/422 when a model cannot take images, and their wording varies, so the
 * body is only matched loosely. It is never forwarded: upstream errors can echo request data.
 */
const REJECTION_STATUSES = new Set([400, 404, 415, 422]);
const REJECTION_WORDS = /image|vision|multimodal|modalit|visual/i;

export function looksLikeImageRejection(status: number, body: string): boolean {
  return REJECTION_STATUSES.has(status) && REJECTION_WORDS.test(body.slice(0, 4000));
}
