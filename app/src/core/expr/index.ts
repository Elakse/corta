/**
 * Tiny expression language for content: plain JavaScript expressions with Math functions in scope
 * (sin, cos, sqrt, PI…) and page variables by name. Used by graph blocks ("k * sin(x)", "cos(theta)").
 * Content is local and trusted (written by the skill), so expressions compile with `new Function`.
 */
import type { VarValue } from "../content/schemas";

const MATH: string[] = Object.getOwnPropertyNames(Math);
const RESERVED = new Set<string>([...MATH, "Math", "true", "false", "null", "undefined", "NaN", "Infinity", "return", "typeof", "let", "const", "var", "new", "function", "this"]);

export type Num = number | string;

/** Identifiers an expression uses that aren't Math names or the given parameters (→ page variables). */
export function exprVars(expr: Num | undefined, params: readonly string[] = []): string[] {
  if (typeof expr !== "string") return [];
  const stripped = expr.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, " ").replace(/\.\s*[A-Za-z_]\w*/g, " ");
  const ids = stripped.match(/[A-Za-z_]\w*/g) ?? [];
  return [...new Set(ids.filter((id) => !RESERVED.has(id) && !params.includes(id)))];
}

const cache = new Map<string, (...args: unknown[]) => unknown>();

/** Compiles `expr` into fn(params..., vars). Throws a readable error on syntax errors. */
export function compile(expr: string, params: readonly string[]): (args: number[], vars: Record<string, VarValue>) => number {
  const key = `${params.join(",")}|${expr}`;
  let fn = cache.get(key);
  if (!fn) {
    const body = `const { ${MATH.join(", ")} } = Math; return (${expr});`;
    try {
      fn = new Function("__vars", ...params, `with (__vars) { ${body} }`) as (...args: unknown[]) => unknown;
    } catch (e) {
      throw new Error(`invalid expression "${expr}": ${e instanceof Error ? e.message : String(e)}`);
    }
    cache.set(key, fn);
  }
  const f = fn;
  return (args, vars) => Number(f(vars, ...args));
}

/** Evaluates a number-or-expression with the current variables (and optional params). */
export function evalNum(v: Num | undefined, vars: Record<string, VarValue>, params: Record<string, number> = {}, fallback = 0): number {
  if (v === undefined) return fallback;
  if (typeof v === "number") return v;
  try {
    const names = Object.keys(params);
    const r = compile(v, names)(names.map((n) => params[n]!), vars);
    return Number.isFinite(r) ? r : fallback;
  } catch {
    return fallback;
  }
}
