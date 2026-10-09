import { normalizePath } from "./build";
import { assetUrls, canvasModules } from "./source";

const byPath = new Map(Object.entries(assetUrls).map(([k, v]) => [normalizePath(k), v]));
const canvasByPath = new Map(Object.entries(canvasModules).map(([k, v]) => [normalizePath(k), v]));

const join = (dir: string, rel: string) => {
  const parts = `${dir}/${rel}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
};

/** Resolves an image path relative to the evaluation folder (or an absolute URL). */
export function resolveAsset(evaluationDir: string, src: string): string | undefined {
  if (/^(https?:|data:)/.test(src)) return src;
  return byPath.get(join(evaluationDir, src)) ?? byPath.get(join(evaluationDir, `assets/${src}`));
}

/** Loader for a canvas module by name (evaluations/<eval>/canvas/<name>.tsx). */
export function canvasLoader(evaluationDir: string, name: string) {
  return canvasByPath.get(join(evaluationDir, `canvas/${name}.tsx`));
}

export function canvasNames(evaluationDir: string): string[] {
  const prefix = `${evaluationDir}/canvas/`;
  return [...canvasByPath.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length, -4));
}
