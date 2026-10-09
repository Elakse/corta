/** Themed lego primitives for canvas modules. Colors are token names, so graphics follow light/dark. */
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { ColorToken } from "@/theme";
import { motionTokens } from "@/theme";
import { usePlane, type Vec2 } from "./Plane";

type Color = ColorToken | (string & {});
const col = (c: Color | undefined, fallback: ColorToken, t: Record<string, unknown>) => (c && c in t ? (t[c] as string) : c) ?? (t[fallback] as string);

export function Grid({ step = 1, color }: { step?: number; color?: Color }) {
  const { view, toPx, width, height, tokens } = usePlane();
  const stroke = col(color, "rule", tokens);
  const lines: ReactNode[] = [];
  for (let x = Math.ceil(view.x[0] / step) * step; x <= view.x[1]; x += step) {
    const [px] = toPx([x, 0]);
    lines.push(<line key={`x${x}`} x1={px} x2={px} y1={0} y2={height} />);
  }
  for (let y = Math.ceil(view.y[0] / step) * step; y <= view.y[1]; y += step) {
    const [, py] = toPx([0, y]);
    lines.push(<line key={`y${y}`} x1={0} x2={width} y1={py} y2={py} />);
  }
  return <g stroke={stroke} strokeWidth={1}>{lines}</g>;
}

export function Axes({ color }: { color?: Color }) {
  const { toPx, width, height, tokens } = usePlane();
  const [ox, oy] = toPx([0, 0]);
  return (
    <g stroke={col(color, "ink-soft", tokens)} strokeWidth={1.2}>
      <line x1={0} x2={width} y1={oy} y2={oy} />
      <line x1={ox} x2={ox} y1={0} y2={height} />
    </g>
  );
}

export function Segment({ from, to, color, width = 1.4, dashed }: { from: Vec2; to: Vec2; color?: Color; width?: number; dashed?: boolean }) {
  const { toPx, tokens } = usePlane();
  const [x1, y1] = toPx(from), [x2, y2] = toPx(to);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col(color, "ink-soft", tokens)} strokeWidth={width} strokeDasharray={dashed ? "5 6" : undefined} strokeLinecap="round" />;
}

/** A vector (arrow) from `from` to `to`. Animates smoothly when its tip moves. */
export function Vector({ to, from = [0, 0], color, width = 3, glow }: { to: Vec2; from?: Vec2; color?: Color; width?: number; glow?: boolean }) {
  const { toPx, tokens } = usePlane();
  const [x0, y0] = toPx(from), [x1, y1] = toPx(to);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const c = col(color, "pen", tokens);
  const head = `M ${x1} ${y1} L ${x1 - 12 * Math.cos(ang - 0.38)} ${y1 - 12 * Math.sin(ang - 0.38)} L ${x1 - 12 * Math.cos(ang + 0.38)} ${y1 - 12 * Math.sin(ang + 0.38)} Z`;
  return (
    <g style={glow ? { filter: `drop-shadow(0 0 6px ${col("pen", "pen", tokens)})` } : undefined}>
      <line x1={x0} y1={y0} x2={x1 - 7 * Math.cos(ang)} y2={y1 - 7 * Math.sin(ang)} stroke={c} strokeWidth={width} strokeLinecap="round" />
      <path d={head} fill={c} />
    </g>
  );
}

export function Point({ at, color, r = 5, ring }: { at: Vec2; color?: Color; r?: number; ring?: boolean }) {
  const { toPx, tokens } = usePlane();
  const [x, y] = toPx(at);
  const c = col(color, "pen", tokens);
  return (
    <g>
      {ring && <circle cx={x} cy={y} r={r + 6} fill={c} opacity={0.15} />}
      <circle cx={x} cy={y} r={r} fill={c} />
    </g>
  );
}

/** Text placed at math coordinates. `hand` uses the handwriting font (like pencil labels). */
export function Label({ at, children, color, hand, size, dx = 6, dy = -6 }: { at: Vec2; children: ReactNode; color?: Color; hand?: boolean; size?: number; dx?: number; dy?: number }) {
  const { toPx, tokens } = usePlane();
  const [x, y] = toPx(at);
  return (
    <text x={x + dx} y={y + dy} fill={col(color, "ink-soft", tokens)} style={{ font: hand ? `700 ${size ?? 19}px ${tokens.font.hand}` : `500 ${size ?? 11}px ${tokens.font.mono}` }}>
      {children}
    </text>
  );
}

/** y = f(x) sampled across the view. */
export function Curve({ f, color, width = 2.2, samples = 240, dashed }: { f: (x: number) => number; color?: Color; width?: number; samples?: number; dashed?: boolean }) {
  const { view, toPx, tokens } = usePlane();
  let d = "";
  let pen = false;
  for (let i = 0; i <= samples; i++) {
    const x = view.x[0] + ((view.x[1] - view.x[0]) * i) / samples;
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e6) {
      pen = false;
      continue;
    }
    const [px, py] = toPx([x, y]);
    d += `${pen ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)} `;
    pen = true;
  }
  return <path d={d} fill="none" stroke={col(color, "pen", tokens)} strokeWidth={width} strokeDasharray={dashed ? "5 6" : undefined} strokeLinejoin="round" />;
}

export function Shape({ points, color, fill, opacity = 0.18 }: { points: Vec2[]; color?: Color; fill?: Color; opacity?: number }) {
  const { toPx, tokens } = usePlane();
  const d = points.map((p, i) => `${i ? "L" : "M"}${toPx(p).join(" ")}`).join(" ") + " Z";
  return <path d={d} stroke={col(color, "pen", tokens)} strokeWidth={1.6} fill={col(fill ?? color, "pen", tokens)} fillOpacity={opacity} />;
}

/** Fades/slides its children in when `show` flips (an animated transition between states). */
export function Transition({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <motion.g initial={false} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: motionTokens.base, ease: motionTokens.ease }}>
      {children}
    </motion.g>
  );
}
