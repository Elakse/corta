/**
 * Pure geometry for the camera pipeline: perspective (a quad mapped to a rectangle), the sheet's real
 * proportions, and rectangle dragging. Coordinates are normalized to the frame (0..1, y down).
 */
export interface Point { x: number; y: number }
/** Corners in reading order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];
export interface Rect { x: number; y: number; w: number; h: number }
export interface Size { w: number; h: number }
/** Row-major 3×3 matrix. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const FULL_RECT: Rect = { x: 0, y: 0, w: 1, h: 1 };

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: Point, b: Point, size: Size) => Math.hypot((a.x - b.x) * size.w, (a.y - b.y) * size.h);

/** A quad inset from the frame edges: where "mark the sheet" starts. */
export function insetQuad(amount: number): Quad {
  return [{ x: amount, y: amount }, { x: 1 - amount, y: amount }, { x: 1 - amount, y: 1 - amount }, { x: amount, y: 1 - amount }];
}

/** Homography taking the unit square (0,0)(1,0)(1,1)(0,1) to the quad's corners (Heckbert). */
export function unitSquareToQuad(q: Quad): Mat3 {
  const [p0, p1, p2, p3] = q;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  if (Math.abs(sx) < 1e-12 && Math.abs(sy) < 1e-12) {
    return [p1.x - p0.x, p2.x - p1.x, p0.x, p1.y - p0.y, p2.y - p1.y, p0.y, 0, 0, 1];
  }
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  return [p1.x - p0.x + g * p1.x, p3.x - p0.x + h * p3.x, p0.x, p1.y - p0.y + g * p1.y, p3.y - p0.y + h * p3.y, p0.y, g, h, 1];
}

export function applyMat3(m: Mat3, u: number, v: number): Point {
  const w = m[6] * u + m[7] * v + m[8];
  return { x: (m[0] * u + m[1] * v + m[2]) / w, y: (m[3] * u + m[4] * v + m[5]) / w };
}

/** GLSL `mat3` constructors are column-major. */
export const toColumnMajor = (m: Mat3): number[] => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

export function quadArea(q: Quad): number {
  let a = 0;
  for (let i = 0; i < 4; i++) { const p = q[i]!, n = q[(i + 1) % 4]!; a += p.x * n.y - n.x * p.y; }
  return Math.abs(a) / 2;
}

/** Convex, non-degenerate and in reading order: a sheet seen from the front or at an angle, never twisted. */
export function isConvexQuad(q: Quad, minArea = 0.01): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i]!, b = q[(i + 1) % 4]!, c = q[(i + 2) % 4]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return quadArea(q) >= minArea;
}

/** Width/height from the edge lengths: right when the sheet faces the camera, foreshortened otherwise. */
export function edgeAspect(q: Quad, size: Size): number {
  const w = (dist(q[0], q[1], size) + dist(q[3], q[2], size)) / 2;
  const h = (dist(q[0], q[3], size) + dist(q[1], q[2], size)) / 2;
  return w / h;
}

type V3 = [number, number, number];
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * The sheet's true width/height seen through a webcam: Zhang & He, "Whiteboard scanning and image
 * enhancement" (2007). Assumes square pixels and the optical axis through the frame's center; the focal
 * length is recovered from the quad itself. Falls back to the edge lengths when the quad is (nearly) frontal
 * or implies an implausible camera, since those cases carry no usable perspective information.
 */
export function estimateAspect(q: Quad, size: Size): number {
  const fallback = edgeAspect(q, size);
  const toV = (p: Point): V3 => [(p.x - 0.5) * size.w, (p.y - 0.5) * size.h, 1];
  const m1 = toV(q[0]), m2 = toV(q[1]), m4 = toV(q[2]), m3 = toV(q[3]);
  const k2 = dot3(cross3(m1, m4), m3) / dot3(cross3(m2, m4), m3);
  const k3 = dot3(cross3(m1, m4), m2) / dot3(cross3(m3, m4), m2);
  if (!Number.isFinite(k2) || !Number.isFinite(k3)) return fallback;
  const n2: V3 = [k2 * m2[0] - m1[0], k2 * m2[1] - m1[1], k2 * m2[2] - m1[2]];
  const n3: V3 = [k3 * m3[0] - m1[0], k3 * m3[1] - m1[1], k3 * m3[2] - m1[2]];
  const denominator = n2[2] * n3[2];
  if (Math.abs(denominator) < 1e-6) return fallback;
  const f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / denominator;
  const focal = Math.sqrt(f2);
  // Webcams sit around 0.6–1.5 frame widths; anything far outside means the corners are not a clean rectangle.
  if (!(focal > 0.4 * size.w && focal < 3 * size.w)) return fallback;
  const length2 = (n: V3) => (n[0] * n[0] + n[1] * n[1]) / f2 + n[2] * n[2];
  const aspect = Math.sqrt(length2(n2) / length2(n3));
  return Number.isFinite(aspect) && aspect > 0.2 && aspect < 5 ? aspect : fallback;
}

export type RectHandle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

/** Rectangle after dragging `handle` by (dx, dy) from `start`; stays inside the frame and above `min`. */
export function dragRect(start: Rect, handle: RectHandle, dx: number, dy: number, min = 0.05): Rect {
  if (handle === "move") {
    const x = clamp(start.x + dx, 0, 1 - start.w), y = clamp(start.y + dy, 0, 1 - start.h);
    return { ...start, x, y };
  }
  let left = start.x, top = start.y, right = start.x + start.w, bottom = start.y + start.h;
  if (handle.includes("w")) left = clamp(left + dx, 0, right - min);
  if (handle.includes("e")) right = clamp(right + dx, left + min, 1);
  if (handle.includes("n")) top = clamp(top + dy, 0, bottom - min);
  if (handle.includes("s")) bottom = clamp(bottom + dy, top + min, 1);
  return { x: left, y: top, w: right - left, h: bottom - top };
}
