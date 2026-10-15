import type { Vec2 } from "./Plane";

type Project = (p: Vec2) => [number, number];
export interface CurveOptions {
  samples?: number;
  /** Exact corners/jumps: each side is sampled separately instead of drawing a diagonal across it. */
  breaks?: readonly number[];
}

/** Sample continuous pieces at screen resolution, preserving declared discontinuities and invalid gaps. */
export function curvePieces(f: (x: number) => number, domain: Vec2, project: Project, options: CurveOptions = {}): [number, number][][] {
  const [lo, hi] = domain;
  if (!(hi > lo)) return [];
  const cuts = [lo, ...new Set((options.breaks ?? []).filter(x => x > lo && x < hi).sort((a, b) => a - b)), hi];
  const samples = options.samples ?? Math.max(160, Math.ceil(Math.abs(project([hi, 0])[0] - project([lo, 0])[0]) * 2));
  const out: [number, number][][] = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const a = cuts[k]!, b = cuts[k + 1]!;
    const count = Math.max(2, Math.ceil(samples * (b - a) / (hi - lo)));
    const epsilon = Math.min((b - a) * 1e-7, 1e-8);
    let piece: [number, number][] = [];
    for (let i = 0; i <= count; i++) {
      const x = a + (b - a) * i / count;
      const sampleX = i === 0 ? a + epsilon : i === count ? b - epsilon : x;
      const y = f(sampleX);
      const p = project([x, y]);
      if (!Number.isFinite(y) || !p.every(Number.isFinite)) {
        if (piece.length) out.push(piece);
        piece = [];
      } else piece.push(p);
    }
    if (piece.length) out.push(piece);
  }
  return out;
}

export const pointsPath = (points: readonly Vec2[]) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");

export function curvePath(f: (x: number) => number, domain: Vec2, project: Project, options?: CurveOptions): string {
  return curvePieces(f, domain, project, options).map(pointsPath).join(" ");
}

/** Follow the curve itself when filling an area; never approximate the top with little rectangles. */
export function areaPath(f: (x: number) => number, domain: Vec2, project: Project, options?: CurveOptions): string {
  const baseline = project([0, 0])[1];
  return curvePieces(f, domain, project, options).map(points => {
    const first = points[0]!, last = points[points.length - 1]!;
    return `${pointsPath([[first[0], baseline], ...points, [last[0], baseline]])} Z`;
  }).join(" ");
}
