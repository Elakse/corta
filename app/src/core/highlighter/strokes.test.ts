import { describe, expect, it } from "vitest";
import type { Box } from "./geometry";
import { bandPath, strokesOf } from "./strokes";

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
const text = (l: number, t: number, w: number, row: Element | null = null): Box => ({ rect: rect(l, t, w, 24), math: false, display: false, row });

describe("highlighter strokes", () => {
  it("draws one continuous stroke per line, across inline math and small gaps", () => {
    const s = strokesOf([text(0, 0, 100), { rect: rect(104, -6, 40, 34), math: true, display: false, row: null }, text(150, 0, 80), text(0, 30, 60)], 18);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ x0: 0, x1: 230 });
    expect(s[0]!.h).toBeLessThan(34); // tall math widens the band a little, not to its full height
    expect(s[1]).toMatchObject({ x0: 0, x1: 60 });
  });
  it("splits side-by-side columns but keeps a table row together", () => {
    expect(strokesOf([text(0, 0, 100), text(300, 0, 100)], 18)).toHaveLength(2);
    const row = {} as Element;
    expect(strokesOf([text(0, 0, 100, row), text(300, 0, 100, row)], 18)).toHaveLength(1);
  });
  it("gives a display formula its own band and covers the letters, not the line box", () => {
    const s = strokesOf([text(0, 0, 100), { rect: rect(40, 30, 200, 60), math: true, display: true, row: null }], 18);
    expect(s).toHaveLength(2);
    expect(s[0]!.h).toBeCloseTo(24 * 0.8);
    expect(s[1]).toMatchObject({ x0: 40, x1: 240 });
    expect(bandPath(s[0]!, 0, 0)).toMatch(/^M[\d.-]+,[\d.-]+ L/);
  });
});
