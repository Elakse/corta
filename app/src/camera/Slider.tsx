import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  icon: LucideIcon;
  /** -100..100, 0 in the middle */
  value: number;
  onChange: (value: number) => void;
  /** tooltip explaining the double-click reset */
  hint?: string;
}

/** A centered slider: the colored stretch runs from the middle to the thumb, so 0 reads as "untouched". */
export function Slider({ label, icon: Icon, value, onChange, hint }: Props) {
  const at = (value + 100) / 2;
  return (
    <label className="cam-slider" title={hint} onDoubleClick={() => onChange(0)} style={{ "--a": `${Math.min(50, at)}%`, "--b": `${Math.max(50, at)}%` } as CSSProperties}>
      <span className="cam-slider-head">
        <Icon size={15} aria-hidden />
        {label}
        <output>{value > 0 ? `+${value}` : value}</output>
      </span>
      <input type="range" min={-100} max={100} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
