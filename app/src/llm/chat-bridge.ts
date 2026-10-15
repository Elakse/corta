/**
 * Lets anything in the app hand the tutor a question: it opens the chat and sends it as soon as the
 * connection is ready and no answer is streaming. One pending slot; a newer request replaces an older one.
 */
import { create } from "zustand";
import { useUi } from "@/state/ui";

export interface TutorRequest {
  /** what the model receives */
  prompt: string;
  /** what the user's bubble shows instead of the full prompt */
  display: string;
  /** text the user selected, shown as a quote above `display` */
  quote?: string;
  /** node the request is about (becomes "this" for the context) */
  nodeId?: string;
}

let seq = 0;
export const useTutorRequests = create<{ pending: (TutorRequest & { seq: number }) | null }>(() => ({ pending: null }));

export function askTutor(request: TutorRequest) {
  const ui = useUi.getState();
  if (request.nodeId) ui.select(request.nodeId);
  ui.setChatOpen(true);
  useTutorRequests.setState({ pending: { ...request, seq: ++seq } });
}

/** Takes the pending request (the chat calls this once it can send). */
export function takeTutorRequest(): TutorRequest | null {
  const { pending } = useTutorRequests.getState();
  if (pending) useTutorRequests.setState({ pending: null });
  return pending;
}
