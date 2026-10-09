import { useId, type ReactNode } from "react";
import type { BlockComponentProps } from "@/core/registry";
import { BlockList } from "@/core/render";
import { renderInline } from "@/core/markup";
import { useCollapsible } from "@/state/ui";
import type { CollapsibleProps } from "./index";

export function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 1.5 L9 6 L3 10.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The notebook's hidden-content toggle, shared by collapsible and exercise. */
export function Reveal({ label, open, onToggle, aside, children }: { label: string; open: boolean; onToggle: () => void; aside?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <div className="sol" data-open={open}>
      <button type="button" className="sol-toggle" data-rl="text" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        <Chevron />
        <span dangerouslySetInnerHTML={{ __html: renderInline(label) }} />
        {aside}
      </button>
      <div className="sol-body" id={id} inert={!open}>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function CollapsibleView({ props, ctx }: BlockComponentProps<CollapsibleProps>) {
  const [open, setOpen] = useCollapsible(ctx.nodeId, ctx.path, props.open);
  return (
    <Reveal label={props.label} open={open} onToggle={() => setOpen(!open)}>
      <BlockList items={props.body} path={`${ctx.path}.0`} />
    </Reveal>
  );
}
