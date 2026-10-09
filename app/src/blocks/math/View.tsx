import { useMemo } from "react";
import type { BlockComponentProps } from "@/core/registry";
import { displayMathHtml, interpolate, placeholders } from "@/core/markup";
import { useVarValues } from "@/core/vars";

export interface MathProps {
  tex: string;
}

export function MathView({ props }: BlockComponentProps<MathProps>) {
  const names = useMemo(() => placeholders(props.tex), [props.tex]);
  const vars = useVarValues(names);
  const html = useMemo(() => displayMathHtml(names.length ? interpolate(props.tex, vars) : props.tex), [props.tex, names, vars]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
