import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { blockRegistry, type BlockContext } from "../registry";
import { useNodeScope } from "./scope";

class BlockBoundary extends Component<{ type: string; children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[block ${this.props.type}]`, error, info.componentStack);
  }
  override render() {
    if (this.state.error)
      return (
        <div className="block-error" role="alert">
          <b>{this.props.type}</b> failed to render: {this.state.error.message}
        </div>
      );
    return this.props.children;
  }
}

/** Renders one block through the registry: error boundary, lazy loading, and the ruler's snap wrapper. */
export function BlockView({ blockType, props, path }: { blockType: string; props: unknown; path: string }) {
  const scope = useNodeScope();
  const def = blockRegistry.get(blockType);
  if (!def) return <div className="block-error">Unknown block “{blockType}”</div>;
  const ctx: BlockContext = { ...scope, path };
  const C = def.component;
  const inner = (
    <BlockBoundary type={blockType}>
      <Suspense fallback={<div className="block-loading" />}>
        <C props={props} ctx={ctx} />
      </Suspense>
    </BlockBoundary>
  );
  const interactive = def.interactive || undefined;
  if (def.ruler === "self") return <div className={`blk blk-${blockType}`} data-interactive={interactive}>{inner}</div>;
  return (
    <div className={`blk blk-${blockType} rl-snap${def.card ? " has-card" : ""}${def.surface ? " has-surface" : ""}`} data-rl="snap" data-interactive={interactive}>
      <div className="rl-snap-inner">{def.card ? <div className="card">{inner}</div> : inner}</div>
    </div>
  );
}

/** Renders a nested list of raw body items (inside layout blocks). Nodes aren't allowed here. */
export function BlockList({ items, path }: { items: unknown[]; path: string }) {
  return (
    <>
      {items.map((item, i) => {
        const [type, raw] = Object.entries((item ?? {}) as Record<string, unknown>)[0] ?? [];
        if (!type) return null;
        const def = blockRegistry.get(type);
        const parsed = def?.schema.safeParse(raw);
        return <BlockView key={i} blockType={type} props={parsed?.success ? parsed.data : raw} path={`${path}.${i}`} />;
      })}
    </>
  );
}
