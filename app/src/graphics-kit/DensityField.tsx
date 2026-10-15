import { useId, useMemo, type ReactNode } from "react";
import { usePlane, type Vec2 } from "./Plane";

/** Smooth density texture in math coordinates, clipped by exact SVG support geometry when supplied. */
export function DensityField({ f, x, y, clip }: { f: (x: number, y: number) => number; x: Vec2; y: Vec2; clip?: ReactNode }) {
  const { toPx, tokens } = usePlane();
  const id = useId().replace(/:/g, "");
  const [left, top] = toPx([x[0], y[1]]), [right, bottom] = toPx([x[1], y[0]]);
  const w = Math.max(1, Math.ceil((right - left) * 2)), h = Math.max(1, Math.ceil((bottom - top) * 2));
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = tokens.pen;
    ctx.fillRect(0, 0, 1, 1);
    const rgb = ctx.getImageData(0, 0, 1, 1).data;
    const values = new Float64Array(w * h);
    let max = 0;
    for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
      const value = Math.max(0, f(x[0] + (x[1] - x[0]) * (col + .5) / w, y[1] - (y[1] - y[0]) * (row + .5) / h));
      values[row * w + col] = Number.isFinite(value) ? value : 0;
      max = Math.max(max, values[row * w + col]!);
    }
    const image = ctx.createImageData(w, h);
    values.forEach((value, i) => {
      image.data[i * 4] = rgb[0]!; image.data[i * 4 + 1] = rgb[1]!; image.data[i * 4 + 2] = rgb[2]!;
      image.data[i * 4 + 3] = value > 0 && max > 0 ? Math.round(255 * (.08 + .5 * value / max)) : 0;
    });
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL();
  }, [f, x, y, w, h, tokens.pen]);
  return <g pointerEvents="none">
    {clip && <defs><clipPath id={id}>{clip}</clipPath></defs>}
    <image href={texture} x={left} y={top} width={right - left} height={bottom - top} preserveAspectRatio="none" clipPath={clip ? `url(#${id})` : undefined} />
  </g>;
}
