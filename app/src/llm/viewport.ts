import { useUi } from "@/state/ui";

/** Viewport y where the reading area starts, just under the sticky top bar. */
export const readingTop = () => document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;

/** One observer per notebook. Scroll reads are batched; sending can synchronously refresh. */
export function createViewportTracker(main: HTMLElement, flow: HTMLElement) {
  const elements = new Map<string, HTMLElement>();
  let frame = 0;
  const measure = () => {
    const bounds = main.getBoundingClientRect();
    const layout = getComputedStyle(main);
    const left = bounds.left + parseFloat(layout.paddingLeft);
    const right = bounds.right - parseFloat(layout.paddingRight);
    const top = readingTop();
    const chat = document.querySelector(".chat")?.getBoundingClientRect();
    // On small screens chat docks below the reading area; it must not count as visible paper.
    const bottom = chat && parseFloat(layout.paddingBottom) > 0 ? Math.min(innerHeight, chat.top) : innerHeight;
    const height = bottom - top;
    const readingLine = top + height * 0.35;
    const visible: Record<string, number> = {};
    if (height > 0) for (const [id, el] of elements) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || !el.getClientRects().length) continue;
      const overlap = Math.min(r.bottom, bottom) - Math.max(r.top, top);
      if (overlap <= 0 || r.right <= left || r.left >= right) continue;
      const fraction = overlap / Math.min(r.height, height);
      const distance = readingLine < r.top ? r.top - readingLine : readingLine > r.bottom ? readingLine - r.bottom : 0;
      // Prefer the block at the reading line, with stable document order breaking ties.
      visible[id] = Math.round((fraction + 2 * (1 - Math.min(1, distance / height))) * 1000) / 1000;
    }
    const { visible: old, selected } = useUi.getState();
    const lostSelection = selected !== null && !visible[selected];
    if (lostSelection || Object.keys(old).length !== Object.keys(visible).length || Object.entries(visible).some(([id, score]) => old[id] !== score)) {
      useUi.setState({ visible, ...(lostSelection ? { selected: null } : {}) });
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); });
  };
  const resize = new ResizeObserver(schedule);
  resize.observe(main);
  resize.observe(flow);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  // Only reading gestures release explicit focus; scrolling inside chat leaves it alone.
  const release = (e: Event) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target === document.documentElement || target === document.body || (target && main.contains(target))) useUi.getState().select(null);
  };
  const onKey = (e: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key) && e.target instanceof Element && !e.target.closest("input, textarea, select, button, [contenteditable]")) release(e);
  };
  window.addEventListener("wheel", release, { passive: true });
  window.addEventListener("touchmove", release, { passive: true });
  window.addEventListener("keydown", onKey);
  schedule();
  return {
    measure,
    register(id: string, el: HTMLElement) {
      elements.set(id, el);
      resize.observe(el);
      schedule();
    },
    unregister(id: string, el: HTMLElement) {
      resize.unobserve(el);
      if (elements.get(id) === el) elements.delete(id);
      schedule();
    },
    disconnect() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", onKey);
      useUi.setState({ visible: {}, selected: null });
    },
  };
}
