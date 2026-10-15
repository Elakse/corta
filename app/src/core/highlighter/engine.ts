/**
 * Corta's own text selection for the notebook, drawn as a highlighter.
 * The browser's selection is off on the sheet for fine pointers (CSS user-select), so browser popups such as
 * Edge's mini menu never appear. This engine keeps the selection as a DOM Range:
 *   drag · double click (word) · triple click (paragraph, cell or formula) · shift-click (extend)
 *   Ctrl/⌘+A (whole sheet) · Esc (clear) · Ctrl/⌘+C (copies `toText(range)`) · auto-scroll at window edges.
 * Formulas are atoms and interactive blocks are never part of it. Touch screens keep the native selection
 * (handles, system menu); its ranges are reported the same way, without ink.
 */
import { atomOf, caretAt, createPieces, elementOf, isSkipped, type Caret } from "./geometry";
import { createInk, type InkMotion } from "./ink";

export interface HighlighterOptions {
  /** text for the clipboard (formulas as LaTeX) */
  toText: (range: Range) => string;
  /** every change; `settled` is false while dragging */
  onChange: (range: Range | null, settled: boolean) => void;
}

/** what a click may start on without becoming a selection */
const CONTROLS = "button, a, input, select, textarea, label, summary, [role='tab'], [contenteditable]";
const BLOCK = "p, li, h1, h2, h3, h4, h5, h6, td, th, pre, [data-rl='math'], [data-rl='text']";
const DRAG_START = 4;
const EDGE = 56;

function before(a: Caret, b: Caret): boolean {
  const r = document.createRange();
  r.setStart(a.node, a.offset);
  return r.comparePoint(b.node, b.offset) >= 0;
}

/** Ordered range between two carets, grown to whole formulas at both ends. */
export function rangeBetween(a: Caret, b: Caret): Range {
  const [s, e] = before(a, b) ? [a, b] : [b, a];
  const r = document.createRange();
  r.setStart(s.node, s.offset);
  r.setEnd(e.node, e.offset);
  const sa = atomOf(s.node), ea = atomOf(e.node);
  if (sa) r.setStartBefore(sa);
  if (ea) r.setEndAfter(ea);
  return r;
}

function wordAt(p: Caret): Range | null {
  const r = document.createRange();
  const atom = atomOf(p.node);
  if (atom) { r.selectNode(atom); return r; }
  if (p.node.nodeType !== Node.TEXT_NODE) return null;
  const text = p.node as Text;
  // at a boundary prefer the word over the space or punctuation next to it
  let hit: Intl.SegmentData | null = null, prev: Intl.SegmentData | null = null;
  for (const s of new Intl.Segmenter(document.documentElement.lang || "es", { granularity: "word" }).segment(text.data)) {
    const end = s.index + s.segment.length;
    if (p.offset >= s.index && p.offset < end) hit = s;
    if (p.offset === end && s.isWordLike) prev = s;
  }
  const s = hit?.isWordLike ? hit : prev ?? hit;
  if (!s) return null;
  r.setStart(text, s.index);
  r.setEnd(text, s.index + s.segment.length);
  return r;
}

export function createHighlighter(root: HTMLElement, svg: SVGSVGElement, opts: HighlighterOptions) {
  const pieces = createPieces(root);
  const ink = createInk(svg, root);
  const fine = matchMedia("(pointer: fine)");
  let anchor: Caret | null = null;
  let range: Range | null = null;
  let drag: { x: number; y: number; moved: boolean } | null = null;
  let scrollFrame = 0;

  const hasText = (r: Range) => !r.collapsed && opts.toText(r).trim().length > 0;
  function set(next: Range | null, motion: InkMotion, settled: boolean) {
    range = next && hasText(next) ? next : null;
    ink.draw(range, motion);
    opts.onChange(range, settled);
  }
  function clear() {
    anchor = null;
    if (!range) return;
    range = null;
    ink.fade();
    opts.onChange(null, true);
  }
  function selectRange(r: Range | null, motion: InkMotion) {
    if (!r) return;
    anchor = { node: r.startContainer, offset: r.startOffset };
    set(rangeBetween(anchor, { node: r.endContainer, offset: r.endOffset }), motion, true);
  }
  function selectAll() {
    pieces.reset();
    const a = pieces.first(), b = pieces.last();
    if (a && b) { anchor = a; set(rangeBetween(a, b), "swipe", true); }
  }

  function track(x: number, y: number) {
    if (!drag || !anchor) return;
    if (!drag.moved && Math.hypot(x - drag.x, y - drag.y) < DRAG_START) return;
    drag.moved = true;
    drag.x = x; drag.y = y;
    const p = caretAt(root, pieces, x, y);
    if (p) set(rangeBetween(anchor, p), "follow", false);
  }

  const onDown = (e: MouseEvent) => {
    const target = e.target as Element;
    if (!fine.matches || e.button !== 0) return;
    if (!root.contains(target)) {
      // a click elsewhere drops the selection, except on floating UI that acts on it
      if (!target.closest("[data-keeps-selection]")) clear();
      return;
    }
    if (isSkipped(root, target) || target.closest(CONTROLS)) return;
    e.preventDefault(); // no native selection
    const active = document.activeElement;
    if (active instanceof HTMLElement && !root.contains(active)) active.blur();
    pieces.reset();
    const p = caretAt(root, pieces, e.clientX, e.clientY);
    if (!p) return;
    if (e.detail === 2) { drag = null; selectRange(wordAt(p), "swipe"); return; }
    if (e.detail >= 3) {
      drag = null;
      const block = elementOf(p.node)?.closest(BLOCK);
      if (block && root.contains(block)) { const r = document.createRange(); r.selectNodeContents(block); selectRange(r, "swipe"); }
      return;
    }
    if (e.shiftKey && anchor) set(rangeBetween(anchor, p), "follow", false);
    else { clear(); anchor = p; }
    drag = { x: e.clientX, y: e.clientY, moved: e.shiftKey };
  };
  const onMove = (e: MouseEvent) => {
    if (!drag) return;
    track(e.clientX, e.clientY);
    const v = e.clientY < EDGE ? e.clientY - EDGE : e.clientY > innerHeight - EDGE ? e.clientY - innerHeight + EDGE : 0;
    cancelAnimationFrame(scrollFrame);
    if (!v) return;
    const step = () => {
      if (!drag) return;
      scrollBy(0, v * 0.35);
      pieces.reset();
      track(drag.x, drag.y);
      scrollFrame = requestAnimationFrame(step);
    };
    scrollFrame = requestAnimationFrame(step);
  };
  const onUp = () => {
    cancelAnimationFrame(scrollFrame);
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) clear();
    else if (range) opts.onChange(range, true);
  };
  const editing = (t: EventTarget | null) => t instanceof Element && !!t.closest("input, textarea, select, [contenteditable]");
  const onKey = (e: KeyboardEvent) => {
    if (editing(e.target)) return;
    if (e.key === "Escape" && range) clear();
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "a" && fine.matches) {
      e.preventDefault();
      selectAll();
    }
  };
  const onCopy = (e: ClipboardEvent) => {
    // a native selection elsewhere (chat, inputs) copies as usual
    if (!range || editing(document.activeElement) || !getSelection()?.isCollapsed) return;
    e.preventDefault();
    e.clipboardData?.setData("text/plain", opts.toText(range));
  };
  // touch: the native selection, reported the same way
  let nativeTimer = 0;
  const onNative = () => {
    if (fine.matches) return;
    clearTimeout(nativeTimer);
    nativeTimer = window.setTimeout(() => {
      const s = getSelection();
      const r = s && s.rangeCount && !s.isCollapsed ? s.getRangeAt(0) : null;
      const inside = r && root.contains(r.commonAncestorContainer) && !isSkipped(root, r.startContainer) && !isSkipped(root, r.endContainer);
      range = inside && hasText(r) ? r : null;
      opts.onChange(range, true);
    }, 120);
  };
  // layout changes (resize, fonts, lazy topics, an opened proof) move the text: repaint the same range
  const resize = new ResizeObserver(() => { pieces.reset(); if (range && fine.matches) ink.draw(range, "redraw"); });
  resize.observe(root);

  document.addEventListener("mousedown", onDown, true);
  addEventListener("mousemove", onMove);
  addEventListener("mouseup", onUp);
  addEventListener("keydown", onKey);
  document.addEventListener("copy", onCopy);
  document.addEventListener("selectionchange", onNative);

  return {
    clear,
    selectAll,
    get range() { return range; },
    destroy() {
      cancelAnimationFrame(scrollFrame);
      clearTimeout(nativeTimer);
      resize.disconnect();
      document.removeEventListener("mousedown", onDown, true);
      removeEventListener("mousemove", onMove);
      removeEventListener("mouseup", onUp);
      removeEventListener("keydown", onKey);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("selectionchange", onNative);
      ink.destroy();
    },
  };
}
export type Highlighter = ReturnType<typeof createHighlighter>;
