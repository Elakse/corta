import type { VarValue } from "../content/schemas";

const PLACEHOLDER = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;

/** Variable names referenced as {{name}} in a string. */
export function placeholders(src: string): string[] {
  return [...new Set([...src.matchAll(PLACEHOLDER)].map((m) => m[1]!))];
}

export function formatVar(v: VarValue | undefined): string {
  if (v === undefined) return "?";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  return String(v);
}

/** Replaces {{name}} with the variable's current value. */
export function interpolate(src: string, vars: Record<string, VarValue>): string {
  return src.replace(PLACEHOLDER, (_, name: string) => formatVar(vars[name]));
}
