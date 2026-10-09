import { useMemo } from "react";
import type { BlockComponentProps } from "@/core/registry";
import { interpolate, placeholders, renderMarkdown } from "@/core/markup";
import { useVarValues } from "@/core/vars";

export function TextView({ props }: BlockComponentProps<string>) {
  const names = useMemo(() => placeholders(props), [props]);
  const vars = useVarValues(names);
  const html = useMemo(() => renderMarkdown(names.length ? interpolate(props, vars) : props), [props, names, vars]);
  return <div className="rl-text" dangerouslySetInnerHTML={{ __html: html }} />;
}
