import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from "react";
import { useTokens, type LiveTokens } from "@/theme";

export type Vec2 = readonly [number, number];

export interface PlaneApi {
  /** math → pixel */
  toPx: (p: Vec2) => [number, number];
  /** pixel → math */
  toMath: (x: number, y: number) => [number, number];
  /** pixels per unit */
  scale: number;
  width: number;
  height: number;
  view: { x: Vec2; y: Vec2 };
  tokens: LiveTokens;
}

const PlaneCtx = createContext<PlaneApi | null>(null);
export function usePlane(): PlaneApi {
  const p = useContext(PlaneCtx);
  if (!p) throw new Error("graphics-kit primitives must be inside <Plane>");
  return p;
}

/**
 * A responsive SVG coordinate plane (y up). Keeps aspect ratio 1:1 by default by widening the view.
 * Children are kit primitives (Grid, Axes, Vector, Point, Label, Segment, Curve, Shape…).
 */
export function Plane({
  height,
  x = [-5, 5],
  y = [-5, 5],
  square = true,
  onPointer,
  children,
  label,
}: {
  height: number;
  x?: Vec2;
  y?: Vec2;
  square?: boolean;
  /** pointer down/move (while pressed) in math coordinates */
  onPointer?: (p: [number, number], phase: "down" | "move" | "up") => void;
  children: ReactNode;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const tokens = useTokens();
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const sy = height / (y[1] - y[0]);
  let view = { x, y };
  let scale = sy;
  if (width > 0) {
    const sx = width / (x[1] - x[0]);
    if (square) {
      scale = Math.min(sx, sy);
      const cx = (x[0] + x[1]) / 2, cy = (y[0] + y[1]) / 2;
      const hw = width / scale / 2, hh = height / scale / 2;
      view = { x: [cx - hw, cx + hw], y: [cy - hh, cy + hh] };
    }
  }
  const sxu = square ? scale : width / (view.x[1] - view.x[0]);
  const syu = square ? scale : height / (view.y[1] - view.y[0]);
  const api: PlaneApi = {
    toPx: ([a, b]) => [(a - view.x[0]) * sxu, height - (b - view.y[0]) * syu],
    toMath: (px, py) => [view.x[0] + px / sxu, view.y[0] + (height - py) / syu],
    scale,
    width,
    height,
    view,
    tokens,
  };
  const handle = (phase: "down" | "move" | "up") => (e: RPointerEvent<SVGSVGElement>) => {
    if (!onPointer) return;
    if (phase === "move" && e.buttons === 0) return;
    // Capture on the stable SVG: a scene's marks can be replaced during a drag.
    if (phase === "down") e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    onPointer(api.toMath(e.clientX - r.left, e.clientY - r.top), phase);
    if (phase === "up" && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  return (
    <div ref={ref} className="kit-plane" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} onPointerDown={handle("down")} onPointerMove={handle("move")} onPointerUp={handle("up")} style={{ touchAction: onPointer ? "none" : undefined, cursor: onPointer ? "grab" : undefined }}>
          <PlaneCtx.Provider value={api}>{children}</PlaneCtx.Provider>
        </svg>
      )}
    </div>
  );
}
