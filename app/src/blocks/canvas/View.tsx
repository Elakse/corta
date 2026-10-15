import { Component, lazy, Suspense, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useStore } from "zustand";
import type { BlockComponentProps } from "@/core/registry";
import { canvasLoader } from "@/core/content/assets";
import { useVarsStore } from "@/core/vars";
import { useTokens } from "@/theme";
import { kit } from "@/graphics-kit";
import type { CanvasProps } from "./index";

class Boundary extends Component<{ name: string; children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    return this.state.error ? (
      <div className="block-error" role="alert">
        canvas <b>{this.props.name}</b>: {this.state.error.message}
      </div>
    ) : (
      this.props.children
    );
  }
}

const cache = new Map<string, ComponentType<any>>();

export function CanvasView({ props, ctx }: BlockComponentProps<CanvasProps>) {
  const tokens = useTokens();
  const store = useVarsStore();
  const vars = useStore(store, (s) => s.values);
  const setVar = useStore(store, (s) => s.set);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const key = `${ctx.evaluationDir}/${props.module}`;
  const Mod = useMemo(() => {
    const load = canvasLoader(ctx.evaluationDir, props.module);
    if (!load) return null;
    if (!cache.has(key)) cache.set(key, lazy(load));
    return cache.get(key)!;
  }, [ctx.evaluationDir, props.module, key]);
  const height = props.height * tokens.u - 26;
  const body = (
    <div ref={ref} style={{ minHeight: height }} className="canvas-host">
      {!Mod ? (
        <div className="block-error">canvas module “{props.module}” not found in {ctx.evaluationDir}/canvas/</div>
      ) : (
        <Boundary name={props.module}>
          <Suspense fallback={null}>
            {width > 0 && <Mod vars={vars} setVar={setVar} tokens={tokens} kit={kit} width={width} height={height} props={props.props} />}
          </Suspense>
        </Boundary>
      )}
    </div>
  );
  return body;
}
