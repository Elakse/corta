import { useMemo } from "react";
import type { BlockComponentProps } from "@/core/registry";
import { renderInline, renderTex } from "@/core/markup";
import { Surface } from "@/ui/Surface";
import type { TableProps } from "./index";

/** A cell that is only "$…$" holding a tall construct (matrix, fraction) renders as display-style math: the row grows to fit. */
const cellHtml = (s: string) => {
  const m = /^\$([^$]+)\$$/.exec(s.trim());
  if (m && /\\begin\{|\\frac/.test(m[1]!)) return renderTex(m[1]!, false);
  return renderInline(s);
};

export function TableView({ props }: BlockComponentProps<TableProps>) {
  const head = useMemo(() => props.columns?.map(cellHtml), [props.columns]);
  const rows = useMemo(() => props.rows.map((r) => r.map(cellHtml)), [props.rows]);
  // short rows are padded so the hairlines and the hover highlight run the full width
  const cols = Math.max(head?.length ?? 0, ...rows.map((r) => r.length));
  return (
    <figure>
      <Surface className="tbl">
        <div className="surface-scroll">
          <table>
            {head && (
              <thead>
                <tr>{head.map((h, i) => <th key={i} dangerouslySetInnerHTML={{ __html: h }} />)}</tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => <td key={j} dangerouslySetInnerHTML={{ __html: c }} />)}
                  {Array.from({ length: cols - r.length }, (_, k) => <td key={`pad${k}`} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
      {props.caption && <figcaption dangerouslySetInnerHTML={{ __html: renderInline(props.caption) }} />}
    </figure>
  );
}
