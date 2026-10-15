import type { ChatErrorCode } from "@shared/api";

/** A tutor failure that may carry a code the chat explains in its own language. */
export class TutorError extends Error {
  constructor(message: string, readonly code?: ChatErrorCode) {
    super(message);
  }
}
