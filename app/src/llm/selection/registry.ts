import type { LucideIcon } from "lucide-react";
import { createRegistry } from "@/core/registry";
import type { StringKey } from "@/i18n";
import { askTutor, passageBlock, type TutorRequest } from "../chat-bridge";

/** What the user selected on a study page. */
export interface SelectionInfo {
  /** selected text; formulas come back as their LaTeX source ($…$ / $$…$$) */
  text: string;
  /** innermost node that contains the whole selection */
  nodeId: string | null;
  nodeTitle?: string;
}

export type Translate = (key: StringKey) => string;

/**
 * A button in the selection menu: it decides what happens with the selection.
 * Adding one = a file in selection/actions/ (see docs/guides/add-llm-action.md).
 */
export interface SelectionActionDef {
  id: string;
  /** position in the menu (ascending) */
  order: number;
  icon: LucideIcon;
  label: StringKey;
  run: (selection: SelectionInfo, t: Translate) => void;
}

export const selectionActionRegistry = createRegistry<SelectionActionDef>("selection actions", (a) => a.id);
export const defineSelectionAction = (a: SelectionActionDef) => a;

export const sortedSelectionActions = () => selectionActionRegistry.list().sort((a, b) => a.order - b.order);

/** Builds the request: the instruction, where the text was selected, and the text itself. */
export function selectionRequest(instruction: string, selection: SelectionInfo, ask: string): TutorRequest {
  return {
    prompt: `${instruction}\n\n${passageBlock(selection)}`,
    display: ask,
    quote: selection.text,
    nodeId: selection.nodeId ?? undefined,
  };
}

interface AskActionDef extends Pick<SelectionActionDef, "id" | "order" | "icon" | "label"> {
  /** the user's bubble text in the chat */
  ask: StringKey;
  /** the instruction the model receives (the selection is appended) */
  prompt: (selection: SelectionInfo) => string;
}

/** An action that asks the tutor something about the selection right away. */
export const defineAskAction = ({ ask, prompt, ...base }: AskActionDef) =>
  defineSelectionAction({ ...base, run: (selection, t) => askTutor(selectionRequest(prompt(selection), selection, t(ask))) });
