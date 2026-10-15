/**
 * The notebook's highlighter selection: a custom text selection drawn as marker strokes.
 * Mount with `useHighlighter` on a text root and an `<svg className="hl-ink">` laid over it;
 * read the current selection from `useTextSelection`.
 */
import { useEffect, type RefObject } from "react";
import { createHighlighter } from "./engine";
import { useTextSelection } from "./store";
import "./highlighter.css";

export { useTextSelection } from "./store";
export { markerColors, markerVar, DEFAULT_MARKER, type MarkerColor } from "./colors";
export { rangeBetween, createHighlighter, type Highlighter } from "./engine";

export function useHighlighter(root: RefObject<HTMLElement | null>, ink: RefObject<SVGSVGElement | null>, toText: (range: Range) => string) {
  useEffect(() => {
    if (!root.current || !ink.current) return;
    const h = createHighlighter(root.current, ink.current, {
      toText,
      onChange: (range, settled) => useTextSelection.setState((s) => ({ range, settled, seq: s.seq + 1 })),
    });
    useTextSelection.setState({ clear: h.clear });
    return () => {
      h.destroy();
      useTextSelection.setState((s) => ({ range: null, settled: false, seq: s.seq + 1, clear: () => {} }));
    };
  }, [root, ink, toText]);
}
