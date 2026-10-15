import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useGraph } from "@/core/content";
import { useTextSelection } from "@/core/highlighter";
import { useT } from "@/i18n";
import { askTutor } from "../chat-bridge";
import { selectionRequest, sortedSelectionActions, type SelectionInfo } from "./registry";
import { selectionNodeId, selectionText } from "./read";
import "./selection.css";

const GAP = 10;
const EDGE = 8;

/** Where to anchor: the top line of the selection (its horizontal middle), and the bottom of its last line. */
function anchorOf(range: Range) {
  const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
  if (!rects.length) return null;
  const top = Math.min(...rects.map((r) => r.top));
  const first = rects.filter((r) => r.top - top < 6);
  return {
    top,
    bottom: Math.max(...rects.map((r) => r.bottom)),
    x: (Math.min(...first.map((r) => r.left)) + Math.max(...first.map((r) => r.right))) / 2,
  };
}

/**
 * Floating menu over the notebook's highlighter selection (core/highlighter). Each button is a registered
 * selection action that hands the selection to the tutor. It appears when a selection settles (not mid-drag)
 * and follows it while scrolling.
 */
export function SelectionMenu() {
  const t = useT();
  const graph = useGraph();
  const reducedMotion = useReducedMotion();
  const { range, settled, seq, clear } = useTextSelection();
  const [tick, setTick] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const info = useMemo<SelectionInfo | null>(() => {
    if (!range || !settled) return null;
    const nodeId = selectionNodeId(range);
    return { text: selectionText(range), nodeId, nodeTitle: nodeId ? graph.nodes.get(nodeId)?.node.title : undefined };
    // seq: the Range object is reused and mutated, so its identity alone doesn't signal a change
  }, [range, settled, seq, graph]);
  const current = info && range ? { info, range } : null;

  useEffect(() => {
    if (!current) return;
    const reposition = () => setTick((n) => n + 1);
    addEventListener("scroll", reposition, { passive: true, capture: true });
    addEventListener("resize", reposition, { passive: true });
    return () => {
      removeEventListener("scroll", reposition, { capture: true });
      removeEventListener("resize", reposition);
    };
  }, [current !== null]);

  // Placed straight on the element (not React state) so scrolling never re-renders the buttons.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || !current) return;
    const a = anchorOf(current.range);
    if (!a) return void (menu.style.visibility = "hidden");
    const topLimit = (document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0) + EDGE;
    const { width, height } = menu.getBoundingClientRect();
    const touch = matchMedia("(pointer: coarse)").matches; // the system's own selection bar sits above on phones
    const below = touch || a.top - GAP - height < topLimit;
    const x = Math.min(innerWidth - EDGE - width / 2, Math.max(EDGE + width / 2, a.x));
    const y = below ? a.bottom + GAP : a.top - GAP - height;
    menu.style.left = `${x - width / 2}px`;
    menu.style.top = `${y}px`;
    menu.style.visibility = a.bottom < topLimit || a.top > innerHeight ? "hidden" : "";
    menu.dataset.side = below ? "below" : "above";
    menu.style.setProperty("--arrow-x", `${Math.min(width - 16, Math.max(16, a.x - (x - width / 2)))}px`);
  }, [current, tick]);

  const run = (id: string) => {
    if (!current) return;
    const action = sortedSelectionActions().find((a) => a.id === id);
    if (!action) return;
    askTutor(selectionRequest(action, current.info, t(action.ask)));
    getSelection()?.removeAllRanges();
    clear();
  };

  return createPortal(
    <AnimatePresence>
      {current && (
        <motion.div
          ref={menuRef}
          className="sel-menu"
          data-keeps-selection
          role="toolbar"
          aria-label={t("selection.label")}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 6, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 4, filter: "blur(4px)", transition: { duration: 0.12 } }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 32, mass: 0.7 }}
          onPointerDown={(e) => e.preventDefault() /* keep the selection while clicking */}
          onMouseDown={(e) => e.preventDefault()}
        >
          {sortedSelectionActions().map((a, i) => (
            <motion.button
              key={a.id}
              type="button"
              className="sel-btn"
              onClick={() => run(a.id)}
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reducedMotion ? 0 : 0.04 + i * 0.04, duration: 0.18 }}
            >
              <a.icon size={15} strokeWidth={2.2} />
              <span>{t(a.label)}</span>
            </motion.button>
          ))}
          <i className="sel-arrow" aria-hidden="true" />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
