/** The notebook's current text selection, as the highlighter reports it. Read by the selection menu. */
import { create } from "zustand";

export interface TextSelectionState {
  range: Range | null;
  /** false while the user is still dragging */
  settled: boolean;
  /** bumps on every change (the Range object is mutable and reused) */
  seq: number;
  clear: () => void;
}

export const useTextSelection = create<TextSelectionState>(() => ({ range: null, settled: false, seq: 0, clear: () => {} }));
