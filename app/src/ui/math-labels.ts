import { renderLabel } from "@/core/markup/labels";

export interface LabelSize { width: number; height: number; baseline: number }
let probe: HTMLSpanElement | null = null;
const cache = new Map<string, LabelSize>();
let fontsReady: Promise<unknown> | null = null;
/** Measure rendered KaTeX and prose together, in the actual font, before placing an SVG label. */
export function measureLabel(text: string, font: string): LabelSize {
  const key = `${font}\u0000${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!probe) {
    probe = document.createElement("span");
    probe.className = "math-label math-label-probe";
    probe.style.cssText = "position:fixed;left:-100000px;top:0;visibility:hidden;white-space:nowrap;width:max-content;line-height:1.3;";
    document.body.append(probe);
    document.fonts?.addEventListener("loadingdone", () => cache.clear());
  }
  probe.style.font = font;
  probe.style.lineHeight = "1.3";
  probe.innerHTML = renderLabel(text);
  const marker = document.createElement("span");
  marker.style.cssText = "display:inline-block;width:0;height:0;";
  probe.append(marker);
  const rect = probe.getBoundingClientRect();
  const result = { width: Math.ceil(rect.width), height: Math.ceil(rect.height), baseline: marker.getBoundingClientRect().bottom - rect.top };
  if (cache.size >= 1024) cache.clear();
  cache.set(key, result);
  return result;
}

/** Font loads may change both formula width and height. */
export function mathFontsReady(): Promise<unknown> {
  return fontsReady ??= Promise.all(["KaTeX_Main", "KaTeX_Math", "KaTeX_Size1", "KaTeX_Size2"].flatMap(font =>
    [document.fonts.load(`14px ${font}`), document.fonts.load(`italic 14px ${font}`)].map(p => p.catch(() => [])),
  )).then(() => cache.clear());
}
