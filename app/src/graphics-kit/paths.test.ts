import { describe, expect, it } from "vitest";
import { areaPath, curvePieces, curvePath } from "./paths";
import type { Vec2 } from "./Plane";

const project = ([x, y]: Vec2): [number, number] => [x * 100, 100 - y * 100];

describe("plot paths", () => {
  it("keeps a uniform density's exact support edges without sloping between samples", () => {
    const pieces = curvePieces(x => x > 0 && x < 1 ? 1 : 0, [-0.4, 1.4], project, { breaks: [0, 1] });
    expect(pieces).toHaveLength(3);
    expect(pieces[0]!.every(p => p[1] === 100)).toBe(true);
    expect(pieces[1]!.every(p => p[1] === 0)).toBe(true);
    expect(pieces[1]![0]).toEqual([0, 0]);
    expect(pieces[1]!.at(-1)).toEqual([100, 0]);
  });
  it("preserves jumps in a discrete CDF", () => {
    const pieces = curvePieces(x => Math.floor(x) / 6, [0, 3], project, { breaks: [1, 2] });
    expect(pieces).toHaveLength(3);
    for (const piece of pieces) expect(new Set(piece.map(p => p[1])).size).toBe(1);
  });
  it("does not connect through invalid domains", () => {
    const path = curvePath(x => Math.abs(x) < .2 ? NaN : x, [-1, 1], project);
    expect((path.match(/M/g) ?? []).length).toBe(2);
    expect(path).not.toMatch(/NaN|Infinity/);
  });
  it("fills the smooth curve rather than stair-shaped rectangles", () => {
    const path = areaPath(x => x * x, [0, 1], project, { samples: 4 });
    expect(path.match(/M/g)).toHaveLength(1);
    expect(path.match(/Z/g)).toHaveLength(1);
    expect(path).toContain("L25.00 93.75");
  });
});
