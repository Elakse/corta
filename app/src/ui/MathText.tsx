import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { renderLabel } from "@/core/markup/labels";
import { mathFontsReady, measureLabel, type LabelSize } from "./math-labels";
import "./math-labels.css";

export function MathText({ text, className = "", style }: { text: string; className?: string; style?: CSSProperties }) {
  const html = useMemo(() => renderLabel(text), [text]);
  return <span className={`math-label ${className}`} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A measured HTML/KaTeX label at SVG coordinates; it never scales the formula to fit a guessed box. */
export function SvgMathLabel({ text, x = 0, y = 0, font, color, anchor = "start", vertical = "baseline", className = "", measured }:
  { text: string; x?: number; y?: number; font: string; color?: string; anchor?: "start" | "middle" | "end"; vertical?: "baseline" | "center"; className?: string; measured?: LabelSize }) {
  const [fonts, setFonts] = useState(0);
  useEffect(() => { let alive = true; void mathFontsReady().then(() => { if (alive) setFonts(1); }); return () => { alive = false; }; }, []);
  const size = useMemo(() => measured ?? measureLabel(text, font), [text, font, fonts, measured]);
  const left = anchor === "middle" ? x - size.width / 2 : anchor === "end" ? x - size.width : x;
  const top = vertical === "center" ? y - size.height / 2 : y - size.baseline;
  return <foreignObject x={left} y={top} width={Math.max(1, size.width)} height={size.height} className={`svg-math-label ${className}`}>
    <MathText text={text} style={{ font, color, lineHeight: 1.3 }} />
  </foreignObject>;
}
