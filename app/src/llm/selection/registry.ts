import type { LucideIcon } from "lucide-react";
import { createRegistry } from "@/core/registry";
import type { StringKey } from "@/i18n";
import type { TutorRequest } from "../chat-bridge";

/** What the user selected on a study page. */
export interface SelectionInfo {
  /** selected text; formulas come back as their LaTeX source ($…$ / $$…$$) */
  text: string;
  /** innermost node that contains the whole selection */
  nodeId: string | null;
  nodeTitle?: string;
}

/**
 * A button in the selection menu. It turns the selection into a tutor request.
 * Adding one = a file in selection/actions/ (see docs/guides/add-llm-action.md).
 */
export interface SelectionActionDef {
  id: string;
  /** position in the menu (ascending) */
  order: number;
  icon: LucideIcon;
  label: StringKey;
  /** the user's bubble text in the chat */
  ask: StringKey;
  /** the instruction the model receives (the selection is appended by the menu) */
  prompt: (selection: SelectionInfo) => string;
}

export const selectionActionRegistry = createRegistry<SelectionActionDef>("selection actions", (a) => a.id);
export const defineSelectionAction = (a: SelectionActionDef) => a;

export const sortedSelectionActions = () => selectionActionRegistry.list().sort((a, b) => a.order - b.order);

/** Builds the request: the action's instruction, where the text was selected, and the text itself. */
export function selectionRequest(action: SelectionActionDef, selection: SelectionInfo, ask: string): TutorRequest {
  const where = selection.nodeId ? `\n\nSelected in node "${selection.nodeTitle ?? selection.nodeId}" (id: ${selection.nodeId}).` : "";
  return {
    prompt: `${action.prompt(selection)}${where}\n\nSelected text:\n"""\n${selection.text}\n"""`,
    display: ask,
    quote: selection.text,
    nodeId: selection.nodeId ?? undefined,
  };
}
