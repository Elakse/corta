/**
 * The ruler: makes every line of text sit on a ruled line, by measuring real baselines (never font metrics).
 * Framework-agnostic: it only knows DOM attributes. Blocks mark their line holders:
 *
 *   data-rl="text"   paragraphs, headings, labels, code, list items → nudged with `top` (no layout change).
 *                    Their line-height is a multiple of --u, so every later line follows the first.
 *   data-rl="math"   display formulas → padded down until the formula's baseline lands on a rule,
 *                    then the block is rounded up to whole lines. Expects a `.katex` inside.
 *   data-rl="table"  a wrapper around a <table> → each row padded so its shared baseline lands on a rule;
 *                    tall cells (matrices) may hang below; the next row makes room.
 *   data-rl="snap"   everything else (cards, canvases, controls) → height rounded up to whole lines.
 *                    The first element child is measured.
 *
 * Order matters: snap → math → tables change layout; text only nudges, so it goes last.
 */

export interface RulerOptions {
  /** px the baseline sits above the rule's ink */
  sink?: number;
  /** minimum px between a math block's top and the formula's ink */
  mathHeadroom?: number;
}

export interface Ruler {
  /** Runs one full alignment pass synchronously. */
  align(): void;
  /** Schedules a pass on the next animation frame (coalesced). */
  schedule(): void;
  /** Baseline of a holder's first line, in px from the flow origin (after the last pass). */
  baselineOf(el: Element): number | undefined;
  /** Rule unit (px). */
  unit(): number;
  /** y of the flow origin in viewport coordinates (top of the ruled area). */
  origin(): number;
  /** Subscribe to "a pass finished". Returns an unsubscribe function. */
  onAligned(cb: () => void): () => void;
  /** Starts observers (resize, fonts, DOM changes, transitions). Returns a dispose function. */
  start(): () => void;
}

const px = (v: string | null | undefined) => parseFloat(v ?? "") || 0;

/** y (viewport) of the baseline at the start of `parent` (or before `before`). */
export function probeBaseline(parent: Element, before?: Node | null): number {
  const p = document.createElement("span");
  p.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  parent.insertBefore(p, before === undefined ? parent.firstChild : before);
  const y = p.getBoundingClientRect().bottom;
  p.remove();
  return y;
}

export function createRuler(frame: HTMLElement, flow: HTMLElement, opts: RulerOptions = {}): Ruler {
  const SINK = opts.sink ?? 2;
  const HEADROOM = opts.mathHeadroom ?? 6;
  const baselines = new WeakMap<Element, number>();
  const listeners = new Set<() => void>();
  let raf = 0;
  let mo: MutationObserver | null = null;
  /**
   * Holders already aligned, keyed by what their alignment depends on (rule unit, width, height and the
   * position of their top within a rule). Blocks are snapped to whole lines, so content changing above a
   * holder shifts it by whole rules and its key stays the same: only holders that really moved off-grid
   * or changed are measured again. Entries are dropped when a mutation touches the holder.
   */
  const done = new WeakMap<Element, { key: string; rel: number }>();
  const keyOf = (r: DOMRect, top: number, o: number, u: number, extra = "") =>
    `${u}|${r.width.toFixed(1)}|${r.height.toFixed(1)}|${((((top - o) % u) + u) % u).toFixed(1)}|${extra}`;

  const unit = () => px(getComputedStyle(frame).getPropertyValue("--u")) || 30;
  const origin = () => frame.getBoundingClientRect().top + frame.clientTop;
  /** first baseline slot ≥ y */
  const ruleAtOrBelow = (y: number, o: number, u: number) => o + Math.ceil((y + SINK - o - 0.01) / u) * u - SINK;
  const nearestRule = (y: number, o: number, u: number) => o + Math.round((y + SINK - o) / u) * u - SINK;
  const roundUp = (h: number, u: number) => Math.max(1, Math.ceil((h - 0.5) / u)) * u;
  const all = (sel: string) => [...flow.querySelectorAll<HTMLElement>(sel)].filter((el) => el.getClientRects().length > 0);

  function snap(u: number) {
    for (const wrap of all('[data-rl="snap"]')) {
      const inner = wrap.firstElementChild as HTMLElement | null;
      if (!inner) continue;
      const h = roundUp(inner.getBoundingClientRect().height, u);
      if (Math.abs(px(wrap.style.height) - h) > 0.5) wrap.style.height = `${h}px`;
    }
  }

  function math(u: number) {
    for (const wrap of all('[data-rl="math"]')) {
      const inner = (wrap.firstElementChild as HTMLElement | null) ?? wrap;
      const html = inner.querySelector(".katex-html") ?? inner.querySelector(".katex");
      if (!html) continue;
      const o = origin();
      const wr = wrap.getBoundingClientRect();
      if (done.get(wrap)?.key === keyOf(wr, wr.top, o, u)) continue;
      const pt = px(inner.style.paddingTop);
      const top = inner.getBoundingClientRect().top;
      const ascent = probeBaseline(html) - top - pt; // baseline depth inside the formula
      const inkTop = html.getBoundingClientRect().top - top - pt;
      const want = ruleAtOrBelow(top + ascent + Math.max(0, HEADROOM - inkTop), o, u) - (top + ascent);
      if (Math.abs(want - pt) > 0.5) inner.style.paddingTop = `${want}px`;
      inner.style.paddingBottom = "0px";
      const h = inner.getBoundingClientRect().height;
      const total = roundUp(h, u);
      if (inner !== wrap && Math.abs(px(wrap.style.height) - total) > 0.5) wrap.style.height = `${total}px`;
      else if (inner === wrap) inner.style.paddingBottom = `${total - h}px`;
      const after = wrap.getBoundingClientRect();
      done.set(wrap, { key: keyOf(after, after.top, o, u), rel: 0 });
    }
  }

  function tables(u: number) {
    for (const wrap of all('[data-rl="table"]')) {
      const t = wrap.querySelector("table");
      if (!t) continue;
      const o0 = origin();
      const wr = wrap.getBoundingClientRect();
      if (done.get(wrap)?.key === keyOf(wr, wr.top, o0, u, t.getBoundingClientRect().height.toFixed(1))) continue;
      let prevInk = -Infinity;
      for (const tr of [...t.rows]) {
        const cells = [...tr.cells];
        const first = cells[0];
        if (!first) continue;
        const o = origin();
        const pt = px(first.style.paddingTop), pb = px(first.style.paddingBottom);
        const r = tr.getBoundingClientRect();
        const baseNow = probeBaseline(first);
        let inkTop = Infinity, inkBot = -Infinity;
        for (const c of cells) {
          const rg = document.createRange();
          rg.selectNodeContents(c);
          const b = rg.getBoundingClientRect();
          if (b.height === 0 && b.width === 0) continue;
          inkTop = Math.min(inkTop, b.top);
          inkBot = Math.max(inkBot, b.bottom);
        }
        if (!isFinite(inkTop)) { inkTop = baseNow - u / 2; inkBot = baseNow; }
        const above = baseNow - inkTop, below = inkBot - baseNow;
        // a baseline slot with room for the tallest cell and for whatever the previous row hangs below its rule
        const B = ruleAtOrBelow(Math.max(r.top + above + 2, prevInk + above + 4), o, u);
        const nt = B - (baseNow - pt);
        const total = Math.max(u, Math.round((B + SINK - r.top) / u) * u); // row ends on the rule under its baseline
        prevInk = B + below;
        const contentH = r.height - pt - pb;
        const nb = Math.max(0, total - nt - contentH);
        if (Math.abs(nt - pt) > 0.5 || Math.abs(nb - pb) > 0.5)
          for (const c of cells) { c.style.paddingTop = `${nt}px`; c.style.paddingBottom = `${nb}px`; }
      }
      const tt = t.getBoundingClientRect();
      const h = Math.ceil((Math.max(tt.bottom, prevInk + 4) - tt.top - 0.5) / u) * u;
      if (Math.abs(px(wrap.style.height) - h) > 0.5) wrap.style.height = `${h}px`;
      const after = wrap.getBoundingClientRect();
      done.set(wrap, { key: keyOf(after, after.top, origin(), u, t.getBoundingClientRect().height.toFixed(1)), rel: 0 });
    }
  }

  function text(u: number) {
    const o = origin();
    for (const el of all('[data-rl="text"]')) {
      const cur = px(el.style.top);
      const r = el.getBoundingClientRect();
      const top = r.top - cur;
      const key = keyOf(r, top, o, u);
      const prev = done.get(el);
      if (prev?.key === key) {
        baselines.set(el, top + prev.rel - o);
        continue;
      }
      const base = probeBaseline(el) - cur;
      const lh = px(getComputedStyle(el).lineHeight) || u;
      const target = nearestRule(top + Math.min(lh, 2 * u) - SINK, o, u); // rule under the first line box
      const dy = Math.round((target - base) * 2) / 2;
      if (Math.abs(dy - cur) > 0.25) el.style.top = `${dy}px`;
      baselines.set(el, target - o);
      done.set(el, { key, rel: target - top });
    }
  }

  const ruler: Ruler = {
    align() {
      if (!flow.isConnected) return;
      const u = unit();
      snap(u);
      math(u);
      tables(u);
      text(u);
      mo?.takeRecords();
      listeners.forEach((l) => l());
    },
    schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ruler.align());
    },
    baselineOf: (el) => baselines.get(el),
    unit,
    origin,
    onAligned(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    start() {
      const schedule = () => ruler.schedule();
      const ro = new ResizeObserver(schedule);
      ro.observe(flow);
      const observeSnaps = () => flow.querySelectorAll('[data-rl="snap"] > *, [data-rl="math"]').forEach((el) => ro.observe(el));
      observeSnaps();
      mo = new MutationObserver((records) => {
        for (const r of records) {
          const el = r.target instanceof Element ? r.target : r.target.parentElement;
          for (let h = el?.closest("[data-rl]"); h; h = h.parentElement?.closest("[data-rl]")) done.delete(h);
        }
        if (records.some((r) => r.type === "childList")) observeSnaps();
        schedule();
      });
      mo.observe(flow, { childList: true, subtree: true, characterData: true });
      // font metrics move baselines without changing boxes: measure everything again
      const refonted = () => {
        flow.querySelectorAll("[data-rl]").forEach((el) => done.delete(el));
        schedule();
      };
      window.addEventListener("resize", schedule);
      flow.addEventListener("transitionend", schedule);
      document.fonts?.ready.then(refonted);
      document.fonts?.addEventListener?.("loadingdone", refonted);
      schedule();
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        mo?.disconnect();
        mo = null;
        window.removeEventListener("resize", schedule);
        flow.removeEventListener("transitionend", schedule);
        document.fonts?.removeEventListener?.("loadingdone", refonted);
      };
    },
  };
  return ruler;
}
