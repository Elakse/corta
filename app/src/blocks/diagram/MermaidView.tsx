import { useEffect, useId, useRef, useState } from "react";
import { useTokens } from "@/theme";

let mermaidP: Promise<typeof import("mermaid").default> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/**
 * Fallback renderer for diagram kinds the graph engine doesn't draw (class and sequence diagrams).
 * Mermaid is loaded on demand and themed from the same tokens as the rest of the page.
 */
export default function MermaidView({ code }: { code: string }) {
  const t = useTokens();
  const id = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  // render only once the diagram comes near the viewport: a page can hold dozens, and each render is a long task
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => {
    if (!near) return;
    let alive = true;
    mermaidP ??= import("mermaid").then((m) => m.default);
    // mermaid.initialize is global: serialize renders so each uses the current theme
    queue = queue.then(async () => {
      const mermaid = await mermaidP!;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: t.font.display,
        themeVariables: {
          fontFamily: t.font.display,
          fontSize: "14px",
          background: "transparent",
          primaryColor: t.paper,
          primaryTextColor: t.ink,
          primaryBorderColor: t.frame,
          secondaryColor: t.surface,
          tertiaryColor: t.card,
          lineColor: t["ink-soft"],
          textColor: t.ink,
          noteBkgColor: t.hl,
          noteTextColor: t.ink,
          edgeLabelBackground: t.card,
          clusterBkg: t.surface,
          clusterBorder: t.frame,
        },
      });
      try {
        const { svg } = await mermaid.render(id, code);
        if (alive) {
          setSvg(svg);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    });
    return () => {
      alive = false;
    };
  }, [code, t, id, near]);
  return error ? (
    <div className="block-error">Mermaid: {error}</div>
  ) : (
    <div className="mermaid-host surface-scroll" ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
