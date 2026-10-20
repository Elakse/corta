import { useEffect, useLayoutEffect, useRef } from "react";
import { useSettings } from "@/state/settings";
import { readingTop } from "@/llm/viewport";
import { isAnchor, pickAnchor, readingKey, restoreDelta, type NodeBox, type ReadingAnchor } from "./reading-position";

const SAVE_AFTER_IDLE_MS = 250;
const RESTORE_TIMEOUT_MS = 6000;
/** Frames the anchor must hold still before restoring is considered done (late layout shifts re-trigger it). */
const STABLE_FRAMES = 8;
/** Reader input that means "I'm driving now": it stops an unfinished restore. */
const TAKEOVER_EVENTS = ["wheel", "touchmove", "keydown", "pointerdown"] as const;

interface Options {
  evaluationKey: string;
  /** mounted node id → element (the notebook's registry) */
  elements: ReadonlyMap<string, HTMLElement>;
  /** Makes sure the node's topic (and those above it) are mounted; false when the id is unknown. */
  reveal: (nodeId: string) => boolean;
}

/**
 * Remembers where the reader is in an evaluation page and puts them back there on reload or when they come
 * back from another screen. The position is a node anchor saved in the settings table (`reading:<evaluation>`),
 * so it survives restarts and is per evaluation, hence per course.
 */
export function useReadingPosition({ evaluationKey, elements, reveal }: Options) {
  const key = readingKey(evaluationKey);
  const loaded = useSettings((s) => s.loaded);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  /** Saving starts only once the saved spot has been restored (or the reader took over), never from the initial top. */
  const armed = useRef(false);
  const saved = useRef("null");

  // The browser's own restore would fight ours on reload.
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  // ---- restore
  useEffect(() => {
    if (!loaded) return;
    const stored = useSettings.getState().values[key];
    const anchor = isAnchor(stored) ? stored : null;
    saved.current = JSON.stringify(anchor);
    armed.current = false;
    if (!anchor || !revealRef.current(anchor.id)) {
      armed.current = true;
      return;
    }
    let frame = 0;
    let stable = 0;
    const deadline = performance.now() + RESTORE_TIMEOUT_MS;
    const stop = () => {
      cancelAnimationFrame(frame);
      for (const e of TAKEOVER_EVENTS) window.removeEventListener(e, finish);
    };
    const finish = () => {
      stop();
      armed.current = true;
    };
    const step = () => {
      const el = elements.get(anchor.id);
      // hidden (inside a closed collapsible) elements report a zero box: not a position to aim for
      if (el?.getClientRects().length) {
        const delta = restoreDelta(el.getBoundingClientRect().top, readingTop(), anchor);
        if (Math.abs(delta) < 1) stable++;
        else {
          stable = 0;
          window.scrollBy({ top: delta, behavior: "instant" });
        }
        if (stable >= STABLE_FRAMES) return finish();
      }
      if (performance.now() >= deadline) return finish();
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    for (const e of TAKEOVER_EVENTS) window.addEventListener(e, finish, { passive: true });
    return stop;
  }, [loaded, key, elements]);

  // ---- save
  const measure = (): ReadingAnchor | null => {
    const boxes: NodeBox[] = [];
    for (const [id, el] of elements) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      boxes.push({ id, top: r.top, bottom: r.bottom });
    }
    return boxes.length ? pickAnchor(boxes, readingTop()) : null;
  };
  const commit = () => {
    if (!armed.current) return;
    const anchor = measure();
    const json = JSON.stringify(anchor);
    if (json === saved.current) return;
    saved.current = json;
    useSettings.getState().set(key, anchor);
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // layout effect: its cleanup runs before React detaches the page, while rects are still real
  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (!armed.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => commitRef.current(), SAVE_AFTER_IDLE_MS);
    };
    const flush = () => {
      clearTimeout(timer);
      commitRef.current();
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, []);
}
