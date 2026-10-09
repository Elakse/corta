import { lazy, useMemo } from "react";
import type { BlockComponentProps } from "@/core/registry";
import { renderInline } from "@/core/markup";
import { GraphView, parseMermaid } from "@/graph";
import { Surface } from "@/ui/Surface";
import type { DiagramProps } from "./index";

const MermaidView = lazy(() => import("./MermaidView"));

/** Flowcharts and state diagrams are drawn by the graph engine; any other Mermaid kind falls back to Mermaid. */
export default function DiagramView({ props }: BlockComponentProps<DiagramProps>) {
  const spec = useMemo(() => parseMermaid(props.code), [props.code]);
  return (
    <figure className="fig-diagram">
      <Surface>{spec ? <GraphView spec={spec} label={props.caption ?? "diagram"} /> : <MermaidView code={props.code} />}</Surface>
      {props.caption && <figcaption dangerouslySetInnerHTML={{ __html: renderInline(props.caption) }} />}
    </figure>
  );
}
