/**
 * Lets anything in the app hand the tutor a question: it opens the chat and sends it as soon as the
 * connection is ready and no answer is streaming. One pending slot; a newer request replaces an older one.
 */
import { create } from "zustand";
import { useUi } from "@/state/ui";
import { expandMessageCommands } from "./message-commands";

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

/** A passage of the notebook the user wants to talk about; it waits above the chat input until they ask. */
export interface TutorReference {
  text: string;
  nodeId?: string | null;
  nodeTitle?: string;
}

export const useTutorReference = create<{ reference: (TutorReference & { seq: number }) | null }>(() => ({ reference: null }));

/** Opens the chat with `reference` pinned above the input, so the user can write whatever they want about it. */
export function referenceTutor(reference: TutorReference) {
  const ui = useUi.getState();
  if (reference.nodeId) ui.select(reference.nodeId);
  ui.setChatOpen(true);
  useTutorReference.setState({ reference: { ...reference, seq: ++seq } });
}

export const clearTutorReference = () => useTutorReference.setState({ reference: null });

/** Where a passage was selected, then the passage itself (formulas as LaTeX): what the model reads after an instruction. */
export function passageBlock({ text, nodeId, nodeTitle }: TutorReference) {
  const where = nodeId ? `Selected in node "${nodeTitle ?? nodeId}" (id: ${nodeId}).\n\n` : "";
  return `${where}Selected text:\n"""\n${text}\n"""`;
}

/** The user's own question about a pinned passage. */
export function referenceRequest(reference: TutorReference, question: string): TutorRequest {
  return {
    prompt: `${expandMessageCommands(question)}\n\n${passageBlock(reference)}`,
    display: question,
    quote: reference.text,
    nodeId: reference.nodeId ?? undefined,
  };
}

/** Takes the pending request (the chat calls this once it can send). */
export function takeTutorRequest(): TutorRequest | null {
  const { pending } = useTutorRequests.getState();
  if (pending) useTutorRequests.setState({ pending: null });
  return pending;
}
