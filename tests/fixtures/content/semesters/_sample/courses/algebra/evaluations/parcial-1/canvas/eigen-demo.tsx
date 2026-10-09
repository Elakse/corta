/**
 * SAMPLE canvas module (port of the prototype's eigenvector demo).
 * Reads theta; drag on the plane writes theta; writes readouts (vTxt, avTxt, eigenMsg) for the text beside it.
 */
import { useEffect } from "react";
import type { CanvasModuleProps } from "@/blocks/canvas/types";

const A = [[2, 1], [1, 2]] as const;
const R = 1.25;

export default function EigenDemo({ vars, setVar, kit, height }: CanvasModuleProps) {
  const { Plane, Grid, Axes, Segment, Vector, Label } = kit;
  const theta = Number(vars.theta ?? 20);
  const t = (theta * Math.PI) / 180;
  const v = [R * Math.cos(t), R * Math.sin(t)] as const;
  const av = [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]] as const;
  const cross = v[0] * av[1] - v[1] * av[0];
  const eig = Math.abs(cross) / (Math.hypot(...v) * Math.hypot(...av)) < 0.035;
  const lam = Math.round(Math.hypot(...av) / Math.hypot(...v));
  const f = (n: number) => (n >= 0 ? " " : "") + n.toFixed(2);

  useEffect(() => {
    setVar("vTxt", `(${f(v[0])}, ${f(v[1])})`);
    setVar("avTxt", `(${f(av[0])}, ${f(av[1])})`);
    setVar("eigenMsg", eig ? `¡Autovector! Av = ${lam}·v` : "Av no es paralelo a v");
  });

  return (
    <Plane
      height={height}
      x={[-4.4, 4.4]}
      y={[-4.4, 4.4]}
      label="Transformación de v por la matriz A"
      onPointer={([x, y]) => setVar("theta", Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360))}
    >
      <Grid />
      <Axes />
      <Segment from={[-6, -6]} to={[6, 6]} dashed />
      <Segment from={[-6, 6]} to={[6, -6]} dashed />
      <Label at={[3.1, 3.45]}>λ = 3</Label>
      <Label at={[3.1, -2.6]}>λ = 1</Label>
      <Vector to={av} color="red" glow={eig} />
      <Vector to={v} color="pen" />
      <Label at={[v[0] * 1.08 + 0.12, v[1] * 1.08 + 0.12]} color="pen" hand dx={0} dy={0}>v</Label>
      <Label at={[av[0] * 1.04 + 0.12, av[1] * 1.04 + 0.12]} color="red" hand dx={0} dy={0}>Av</Label>
    </Plane>
  );
}
