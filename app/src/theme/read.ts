import { useEffect, useState } from "react";
import { colorTokens, fonts, metrics, type ColorToken, type FontToken } from "./tokens";

/** Reads a token's live value (theme-aware) from CSS. Use in canvas/SVG graphics. */
export function readToken(name: ColorToken | `f-${FontToken}` | "u"): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

export type LiveTokens = Record<ColorToken, string> & { font: Record<FontToken, string>; u: number };

function snapshot(): LiveTokens {
  const css = getComputedStyle(document.documentElement);
  const out = {} as Record<ColorToken, string>;
  for (const k of colorTokens) out[k] = css.getPropertyValue(`--${k}`).trim();
  const font = {} as Record<FontToken, string>;
  for (const k of Object.keys(fonts) as FontToken[]) font[k] = css.getPropertyValue(`--f-${k}`).trim();
  return { ...out, font, u: parseFloat(css.getPropertyValue("--u")) || metrics.u };
}

/** Live token values; re-reads when the theme (data-theme or system scheme) or viewport changes. */
export function useTokens(): LiveTokens {
  const [t, setT] = useState(snapshot);
  useEffect(() => {
    // keep the same object while nothing changed: consumers (diagrams, canvases) depend on its identity
    const update = () => setT((prev) => {
      const next = snapshot();
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return t;
}
