import "mafs/core.css";
import { Coordinates, Mafs, MovablePoint, Plot, Point, Text, Vector, Line, useTransformContext, vec } from "mafs";
import type { BlockComponentProps } from "@/core/registry";
import { compile, evalNum } from "@/core/expr";
import { useVarsStore } from "@/core/vars";
import { useStore } from "zustand";
import { renderInline } from "@/core/markup";
import { useTokens } from "@/theme";
import type { Graph2DProps } from "./index";
import { hasLabelMath } from "@/core/markup/labels";
import { SvgMathLabel } from "@/ui/MathText";
import { fonts } from "@/theme";

const color = (c: string) => (/^[a-z-]+$/.test(c) ? `var(--${c})` : c);

function PlotLabel({ at, text, color }: { at: [number, number]; text: string; color: string }) {
  const { viewTransform, userTransform } = useTransformContext();
  const [x, y] = vec.transform(at, vec.matrixMult(viewTransform, userTransform));
  return hasLabelMath(text)
    ? <SvgMathLabel text={text} x={x + 8} y={y - 8} font={`500 16px ${fonts.body}`} color={color} />
    : <Text x={at[0]} y={at[1]} attach="ne" color={color}>{text}</Text>;
}

export default function Graph2DView({ props }: BlockComponentProps<Graph2DProps>) {
  const store = useVarsStore();
  const vars = useStore(store, (s) => s.values);
  const setVar = useStore(store, (s) => s.set);
  const { u } = useTokens();
  const n = (v: number | string) => evalNum(v, vars);
  const pt = (p: readonly [number | string, number | string]) => [n(p[0]), n(p[1])] as [number, number];
  return (
    <figure className="blk-graph">
      <Mafs height={props.height * u - 24} viewBox={{ x: props.view.x, y: props.view.y, padding: 0 }} preserveAspectRatio={false} pan={false}>
        {props.grid ? <Coordinates.Cartesian subdivisions={false} /> : null}
        {props.plots.map((p, i) => {
          const f = compile(p.fn, ["x"]);
          return <Plot.OfX key={i} y={(x) => f([x], vars)} color={color(p.color)} style={p.dashed ? "dashed" : "solid"} />;
        })}
        {props.parametric.map((p, i) => {
          const fx = compile(p.x, ["t"]), fy = compile(p.y, ["t"]);
          return <Plot.Parametric key={i} t={p.t} xy={(t) => [fx([t], vars), fy([t], vars)]} color={color(p.color)} />;
        })}
        {props.segments.map((s, i) => (
          <Line.Segment key={i} point1={pt(s.from)} point2={pt(s.to)} color={color(s.color)} style={s.dashed ? "dashed" : "solid"} />
        ))}
        {props.vectors.map((v, i) => {
          const tip = pt(v.to);
          return (
            <g key={i}>
              <Vector tail={pt(v.from)} tip={tip} color={color(v.color)} weight={3} />
              {v.label && <PlotLabel at={tip} text={v.label} color={color(v.color)} />}
            </g>
          );
        })}
        {props.points.map((p, i) => {
          const at = pt(p.at);
          const drag = p.drag;
          return (
            <g key={i}>
              {drag ? (
                <MovablePoint
                  point={at}
                  color={color(p.color)}
                  onMove={([x, y]) => {
                    if (drag.x) setVar(drag.x, Math.round(x * 100) / 100);
                    if (drag.y) setVar(drag.y, Math.round(y * 100) / 100);
                  }}
                />
              ) : (
                <Point x={at[0]} y={at[1]} color={color(p.color)} />
              )}
              {p.label && <PlotLabel at={at} text={p.label} color={color(p.color)} />}
            </g>
          );
        })}
      </Mafs>
      {props.caption && <figcaption dangerouslySetInnerHTML={{ __html: renderInline(props.caption) }} />}
    </figure>
  );
}
