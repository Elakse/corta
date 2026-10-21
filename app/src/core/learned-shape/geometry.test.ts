import { describe, expect, it } from "vitest";
import { checkboxX, isTallLine, shapePaths, shapeRadius, tabGap, type ShapePos } from "./geometry";

const U = 30;
const CB = 19;
const CB_RADIUS = 4;
const P = tabGap(U, CB);
const R = shapeRadius(CB_RADIUS, P);

const pos = (over: Partial<ShapePos> = {}): ShapePos => ({
  x: 100, cy: 200, cb: CB, p: P, fx: 120, bw: 1.4, right: 900, bottom: 400, headroom: null, ...over,
});

interface Cmd { c: string; n: number[] }
const parse = (d: string): Cmd[] =>
  [...d.matchAll(/([MHVAZ])([^MHVAZ]*)/g)].map((m) => ({ c: m[1]!, n: m[2]!.trim() ? m[2]!.trim().split(/[\s,]+/).map(Number) : [] }));
const arcs = (d: string) => parse(d).filter((c) => c.c === "A");

describe("learned-shape geometry", () => {
  it("derives the gap and the single radius from u, checkbox size and radius", () => {
    expect(P).toBe(5.5);
    expect(R).toBe(9.5);
    expect(tabGap(28, 15)).toBe(6.5);
  });

  it("is one closed path", () => {
    const { d } = shapePaths(pos(), U, CB_RADIUS);
    const cmds = parse(d);
    expect(cmds[0]!.c).toBe("M");
    expect(cmds.filter((c) => c.c === "M")).toHaveLength(1);
    expect(cmds.at(-1)!.c).toBe("Z");
    expect(d.match(/Z/g)).toHaveLength(1);
  });

  it("uses the same radius on every arc (flush: 6 arcs, ear: 8)", () => {
    const flush = arcs(shapePaths(pos(), U, CB_RADIUS).d);
    const ear = arcs(shapePaths(pos({ headroom: 100 }), U, CB_RADIUS).d);
    expect(flush).toHaveLength(6);
    expect(ear).toHaveLength(8);
    for (const a of [...flush, ...ear]) {
      expect(a.n[0]).toBe(R);
      expect(a.n[1]).toBe(R);
    }
  });

  it("makes the tab exactly one line tall (flush)", () => {
    const cmds = parse(shapePaths(pos(), U, CB_RADIUS).d);
    const tabTop = cmds[0]!.n[1]!;
    const tabBottom = arcs(shapePaths(pos(), U, CB_RADIUS).d)[1]!.n[6]!;
    expect(tabTop).toBe(200 - U / 2);
    expect(tabBottom - tabTop).toBe(U);
  });

  it("makes the tab exactly one line tall (ear) and starts the band at the headroom", () => {
    const { d } = shapePaths(pos({ headroom: 100 }), U, CB_RADIUS);
    const a = arcs(d);
    const bandTop = parse(d)[0]!.n[1]!;
    expect(bandTop).toBe(100);
    const tabTop = a[1]!.n[6]!; // end of the second concave join
    const tabBottom = a[3]!.n[6]!;
    expect(tabBottom - tabTop).toBe(U);
  });

  it("falls back to a flush tab when there is no room for the ear", () => {
    // tab top is 185; headroom 170 leaves 15 < 2r (19)
    const { d } = shapePaths(pos({ headroom: 170 }), U, CB_RADIUS);
    expect(arcs(d)).toHaveLength(6);
    expect(parse(d)[0]!.n[1]).toBe(185);
  });

  it("puts the band bottom half a line under the node, never closer than 2r + 4 to the tab", () => {
    const tall = arcs(shapePaths(pos({ bottom: 400 }), U, CB_RADIUS).d);
    expect(tall[3]!.n[6]).toBe(400 + U / 2); // arc into the bottom edge
    const short = arcs(shapePaths(pos({ bottom: 190 }), U, CB_RADIUS).d);
    const tabBottom = 200 + U / 2;
    expect(short[3]!.n[6]).toBe(tabBottom + 2 * R + 4);
  });

  it("spans the band from the left border centre to the right border centre", () => {
    const { d } = shapePaths(pos(), U, CB_RADIUS);
    const cmds = parse(d);
    expect(cmds[0]!.n[0]).toBe(120); // starts on the left border
    const rightArc = arcs(d)[4]!;
    expect(rightArc.n[5]).toBe(900);
  });

  it("covers the frame border with the patch, taller with an ear", () => {
    const flush = shapePaths(pos(), U, CB_RADIUS).patch;
    expect(flush.x).toBeCloseTo(120 - 0.7 - 0.5);
    expect(flush.w).toBeCloseTo(1.4 + 1);
    expect(flush.y).toBe(185);
    expect(flush.h).toBeCloseTo(U + R - 3);
    const ear = shapePaths(pos({ headroom: 100 }), U, CB_RADIUS).patch;
    expect(ear.y).toBe(185 - (R - 3));
    expect(ear.h).toBeCloseTo(U + 2 * (R - 3));
  });

  it("follows the checkbox size (concentric)", () => {
    const p = tabGap(28, 15);
    const a = arcs(shapePaths({ ...pos(), cb: 15, p }, 28, CB_RADIUS).d);
    for (const x of a) expect(x.n[0]).toBe(CB_RADIUS + p);
  });

  it("recognizes tall first lines", () => {
    expect(isTallLine(45, U)).toBe(true);
    expect(isTallLine(44, U)).toBe(false);
    expect(isTallLine(U, U)).toBe(false);
  });

  it("puts deeper checkboxes closer to the frame, depth capped at 2", () => {
    const xs = [0, 1, 2, 5].map((d) => checkboxX(d, 120, CB, P, 14));
    expect(xs[2]! - xs[1]!).toBe(14);
    expect(xs[1]! - xs[0]!).toBe(14);
    expect(xs[3]).toBe(xs[2]);
    expect(xs[2]).toBe(120 - 6 - P - CB / 2);
    expect(checkboxX(0, 120, 15, 6.5, 9)).toBe(120 - 6 - 6.5 - 7.5 - 18);
  });
});
