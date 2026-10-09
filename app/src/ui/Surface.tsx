import "./surface.css";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * The solid card every "thing on the page" sits on (code, tables, diagrams): it hides the ruled paper behind it
 * so lines never run through the content. `head` is an optional strip on top (language label, tabs, actions).
 * Variants are CSS classes (`surface-code`, …), never props: styling stays in tokens + CSS.
 */
export function Surface({ head, className = "", children, ...rest }: { head?: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`surface ${className}`.trim()} {...rest}>
      {head && <div className="surface-head">{head}</div>}
      {children}
    </div>
  );
}
