/** Draggable marks over the camera picture: the sheet's four corners, and the crop rectangle. */
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { useT, type StringKey } from "@/i18n";
import { applyMat3, clamp, dragRect, isConvexQuad, unitSquareToQuad, type Point, type Quad, type Rect, type RectHandle } from "./geometry";

const pct = (n: number) => `${n * 100}%`;
const NUDGE = 0.004;
const CORNER_LABELS: StringKey[] = ["camera.corner.tl", "camera.corner.tr", "camera.corner.br", "camera.corner.bl"];
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

function toFrame(e: { clientX: number; clientY: number }, box: HTMLElement): Point {
  const r = box.getBoundingClientRect();
  return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
}

/** Arrow-key nudge in frame units (Shift = bigger steps), or null for other keys. */
function nudge(e: KeyboardEvent): [number, number] | null {
  const dir = ARROWS[e.key];
  if (!dir) return null;
  e.preventDefault();
  const step = e.shiftKey ? NUDGE * 5 : NUDGE;
  return [dir[0] * step, dir[1] * step];
}

/** The sheet's corners. Moves that would twist the quad are ignored, so it always stays a sheet. */
export function QuadEditor({ quad, onChange }: { quad: Quad; onChange: (quad: Quad) => void }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const grab = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const place = (index: number, x: number, y: number) => {
    const next = quad.map((c, i) => (i === index ? { x: clamp(x, 0, 1), y: clamp(y, 0, 1) } : c)) as Quad;
    if (isConvexQuad(next)) onChange(next);
  };
  const h = unitSquareToQuad(quad);
  // Thirds follow the perspective, like the ruled lines of the sheet should.
  const lines = [1 / 3, 2 / 3].flatMap((s) => [[applyMat3(h, s, 0), applyMat3(h, s, 1)], [applyMat3(h, 0, s), applyMat3(h, 1, s)]] as const);
  return (
    <div className="cam-overlay" ref={box}>
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
        <polygon className="cam-quad" points={quad.map((p) => `${p.x},${p.y}`).join(" ")} />
        {lines.map(([a, b], i) => <line key={i} className="cam-grid" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
      </svg>
      {quad.map((p, i) => (
        <button
          key={i} type="button" className="cam-handle" style={{ left: pct(p.x), top: pct(p.y) }} aria-label={t(CORNER_LABELS[i]!)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const at = toFrame(e, box.current!);
            grab.current = { index: i, dx: at.x - p.x, dy: at.y - p.y };
          }}
          onPointerMove={(e) => {
            if (grab.current?.index !== i) return;
            const at = toFrame(e, box.current!);
            place(i, at.x - grab.current.dx, at.y - grab.current.dy);
          }}
          onPointerUp={() => { grab.current = null; }}
          onPointerCancel={() => { grab.current = null; }}
          onKeyDown={(e) => { const d = nudge(e); if (d) place(i, p.x + d[0], p.y + d[1]); }}
        />
      ))}
    </div>
  );
}

const CORNERS: { handle: RectHandle; label: StringKey; at: (r: Rect) => Point }[] = [
  { handle: "nw", label: "camera.corner.tl", at: (r) => ({ x: r.x, y: r.y }) },
  { handle: "ne", label: "camera.corner.tr", at: (r) => ({ x: r.x + r.w, y: r.y }) },
  { handle: "se", label: "camera.corner.br", at: (r) => ({ x: r.x + r.w, y: r.y + r.h }) },
  { handle: "sw", label: "camera.corner.bl", at: (r) => ({ x: r.x, y: r.y + r.h }) },
];

/** The part of the picture to keep: drag the body to move it, the edges and corners to resize it. */
export function CropEditor({ rect, onChange }: { rect: Rect; onChange: (rect: Rect) => void }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: RectHandle; start: Point; rect: Rect } | null>(null);
  const { x, y, w, h } = rect;
  return (
    <div
      className="cam-overlay" ref={box}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        const handle = (e.target as HTMLElement).closest<HTMLElement>("[data-handle]")?.dataset.handle as RectHandle | undefined;
        if (!handle) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { handle, start: toFrame(e, box.current!), rect };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const at = toFrame(e, box.current!);
        onChange(dragRect(d.rect, d.handle, at.x - d.start.x, at.y - d.start.y));
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
        <path className="cam-dim" d={`M0 0H1V1H0Z M${x} ${y}V${y + h}H${x + w}V${y}Z`} />
        <rect className="cam-quad cam-cropline" x={x} y={y} width={w} height={h} />
      </svg>
      <div className="cam-move" data-handle="move" style={{ left: pct(x), top: pct(y), width: pct(w), height: pct(h) }} />
      <div className="cam-edge cam-edge-h" data-handle="n" style={{ left: pct(x), top: pct(y), width: pct(w) }} />
      <div className="cam-edge cam-edge-h" data-handle="s" style={{ left: pct(x), top: pct(y + h), width: pct(w) }} />
      <div className="cam-edge cam-edge-v" data-handle="w" style={{ left: pct(x), top: pct(y), height: pct(h) }} />
      <div className="cam-edge cam-edge-v" data-handle="e" style={{ left: pct(x + w), top: pct(y), height: pct(h) }} />
      {CORNERS.map(({ handle, label, at }) => {
        const p = at(rect);
        return (
          <button
            key={handle} type="button" className="cam-handle cam-handle-square" data-handle={handle} aria-label={t(label)}
            style={{ left: pct(p.x), top: pct(p.y) }}
            onKeyDown={(e) => { const d = nudge(e); if (d) onChange(dragRect(rect, handle, d[0], d[1])); }}
          />
        );
      })}
    </div>
  );
}
