import { motion } from "motion/react";
import { motionTokens } from "@/theme";

/** Thin progress bar (pen → learned when complete). */
export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`pbar ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.i initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: 0.9, ease: motionTokens.ease }} data-done={value >= 0.999 || undefined} />
    </div>
  );
}

/** Circular progress with the number inside. */
export function ProgressRing({ value, size = 120, stroke = 7, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="pring" style={{ width: size, height: size, ["--s" as string]: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="pring-track" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="pring-value"
          strokeWidth={stroke}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 1.2, ease: motionTokens.ease }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="pring-label">
        <b>{Math.round(value * 100)}</b>
        <span>%</span>
        {label && <small>{label}</small>}
      </div>
    </div>
  );
}
