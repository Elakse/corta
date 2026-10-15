import { lazy, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BlockComponentProps } from "@/core/registry";
import { renderInline } from "@/core/markup";
import { GraphView, parseMermaid } from "@/graph";
import { Surface } from "@/ui/Surface";
import { metrics } from "@/theme";
import type { DiagramProps } from "./index";

const MermaidView = lazy(() => import("./MermaidView"));

/** Flowcharts and state diagrams are drawn by the graph engine; any other Mermaid kind falls back to Mermaid. */
export default function DiagramView({ props }: BlockComponentProps<DiagramProps>) {
  const spec = useMemo(() => parseMermaid(props.code), [props.code]);
  const ref = useRef<HTMLElement>(null);
  const [style, setStyle] = useState<CSSProperties>();
  useLayoutEffect(() => {
    // Measure the stable parent, not the figure we extend, to avoid a resize feedback loop.
    const parent = ref.current!.parentElement!;
    const measure = () => {
      const viewport = document.documentElement.clientWidth;
      const gutter = metrics.phone.u / 2;
      const next = viewport <= metrics.phone.maxWidth
        ? { width: viewport - 2 * gutter, marginLeft: gutter - parent.getBoundingClientRect().left }
        : undefined;
      setStyle(previous => previous?.width === next?.width && previous?.marginLeft === next?.marginLeft ? previous : next);
    };
    window.addEventListener("resize", measure);
    measure();
    return () => window.removeEventListener("resize", measure);
  }, []);
  return (
    <figure ref={ref} className="fig-diagram" style={style}>
      <Surface>{spec ? <GraphView spec={spec} label={props.caption ?? "diagram"} /> : <MermaidView code={props.code} />}</Surface>
      {props.caption && <figcaption dangerouslySetInnerHTML={{ __html: renderInline(props.caption) }} />}
    </figure>
  );
}
