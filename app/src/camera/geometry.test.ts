import { describe, expect, it } from "vitest";
import { applyMat3, dragRect, edgeAspect, estimateAspect, insetQuad, isConvexQuad, toColumnMajor, unitSquareToQuad, type Quad } from "./geometry";

const frame = { w: 1280, h: 720 };

/** A sheet of `w`×`h` lying on a plane, tilted by (tx, ty) radians, `distance` away from a pinhole camera. */
function project(w: number, h: number, tx: number, ty: number, distance: number, focal: number): Quad {
  const corners: [number, number][] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
  return corners.map(([x, y]) => {
    const y1 = y * Math.cos(tx), z1 = y * Math.sin(tx);
    const x2 = x * Math.cos(ty) + z1 * Math.sin(ty);
    const z2 = -x * Math.sin(ty) + z1 * Math.cos(ty);
    const z = z2 + distance;
    return { x: (focal * x2 / z + frame.w / 2) / frame.w, y: (focal * y1 / z + frame.h / 2) / frame.h };
  }) as Quad;
}

describe("unitSquareToQuad", () => {
  it("maps the unit square's corners onto the quad", () => {
    const q: Quad = [{ x: 0.2, y: 0.1 }, { x: 0.9, y: 0.2 }, { x: 0.8, y: 0.9 }, { x: 0.1, y: 0.7 }];
    const m = unitSquareToQuad(q);
    [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], i) => {
      const p = applyMat3(m, u!, v!);
      expect(p.x).toBeCloseTo(q[i]!.x, 9);
      expect(p.y).toBeCloseTo(q[i]!.y, 9);
    });
  });
  it("is affine for a parallelogram and the identity for the full frame", () => {
    expect(unitSquareToQuad(insetQuad(0))).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const m = unitSquareToQuad([{ x: 0.1, y: 0.1 }, { x: 0.6, y: 0.2 }, { x: 0.7, y: 0.6 }, { x: 0.2, y: 0.5 }]);
    expect(m[6]).toBe(0);
    expect(m[7]).toBe(0);
  });
  it("lays out column-major for GLSL", () => {
    expect(toColumnMajor([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
  });
});

describe("isConvexQuad", () => {
  it("accepts a sheet seen at an angle and rejects twisted, degenerate or tiny quads", () => {
    expect(isConvexQuad(insetQuad(0.1))).toBe(true);
    expect(isConvexQuad([{ x: 0.2, y: 0.1 }, { x: 0.9, y: 0.2 }, { x: 0.8, y: 0.9 }, { x: 0.1, y: 0.7 }])).toBe(true);
    expect(isConvexQuad([{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.9, y: 0.1 }, { x: 0.1, y: 0.9 }])).toBe(false);
    expect(isConvexQuad([{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.9 }, { x: 0.3, y: 0.3 }])).toBe(false);
    expect(isConvexQuad(insetQuad(0.46))).toBe(false);
    // a dent (concave) quad
    expect(isConvexQuad([{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.5, y: 0.4 }, { x: 0.1, y: 0.9 }])).toBe(false);
  });
});

describe("estimateAspect", () => {
  it("recovers an A4 sheet's proportions from a tilted view", () => {
    const quad = project(297, 210, 0.7, 0.2, 600, 900);
    expect(edgeAspect(quad, frame)).toBeGreaterThan(1.414 * 1.1); // the plain edge ratio is visibly off
    expect(estimateAspect(quad, frame)).toBeCloseTo(297 / 210, 2);
  });
  it("works for a portrait sheet and either tilt direction", () => {
    expect(estimateAspect(project(210, 297, -0.6, -0.25, 700, 1000), frame)).toBeCloseTo(210 / 297, 2);
    expect(estimateAspect(project(279, 216, 0.5, 0.35, 650, 800), frame)).toBeCloseTo(279 / 216, 2);
  });
  it("falls back to the edge lengths for a frontal sheet", () => {
    const quad = insetQuad(0.1);
    expect(estimateAspect(quad, frame)).toBeCloseTo(edgeAspect(quad, frame), 9);
  });
  it("falls back when the corners imply an implausible camera", () => {
    const quad: Quad = [{ x: 0.1, y: 0.2 }, { x: 0.95, y: 0.1 }, { x: 0.55, y: 0.95 }, { x: 0.05, y: 0.9 }];
    const aspect = estimateAspect(quad, frame);
    expect(Number.isFinite(aspect)).toBe(true);
    expect(aspect).toBeGreaterThan(0.2);
    expect(aspect).toBeLessThan(5);
  });
});

describe("dragRect", () => {
  const start = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
  it("moves without leaving the frame", () => {
    expect(dragRect(start, "move", 0.1, -0.1)).toEqual({ x: 0.30000000000000004, y: 0.1, w: 0.4, h: 0.4 });
    expect(dragRect(start, "move", 5, 5)).toEqual({ x: 0.6, y: 0.6, w: 0.4, h: 0.4 });
    expect(dragRect(start, "move", -5, -5)).toEqual({ x: 0, y: 0, w: 0.4, h: 0.4 });
  });
  it("resizes by edges and corners, keeping a minimum size", () => {
    const e = dragRect(start, "e", 0.2, 0);
    expect(e.x).toBeCloseTo(0.2); expect(e.w).toBeCloseTo(0.6);
    const nw = dragRect(start, "nw", -0.1, -0.1);
    expect(nw.x).toBeCloseTo(0.1); expect(nw.y).toBeCloseTo(0.1); expect(nw.w).toBeCloseTo(0.5); expect(nw.h).toBeCloseTo(0.5);
    const squeezed = dragRect(start, "w", 5, 0, 0.05);
    expect(squeezed.w).toBeCloseTo(0.05);
    expect(squeezed.x + squeezed.w).toBeCloseTo(0.6);
    const out = dragRect(start, "se", 5, 5);
    expect(out.x + out.w).toBeCloseTo(1); expect(out.y + out.h).toBeCloseTo(1);
  });
});
