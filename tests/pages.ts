/** Every evaluation page that has content (found on disk), so new courses join the e2e tests automatically. */
import { readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function evaluationPages(): { name: string; url: string }[] {
  const out: { name: string; url: string }[] = [];
  for (const sems of [join(ROOT, "tests/fixtures/content/semesters"), join(ROOT, "content/semesters")]) {
  if (!existsSync(sems)) continue;
  for (const s of readdirSync(sems)) {
    const courses = join(sems, s, "courses");
    if (!existsSync(courses)) continue;
    for (const c of readdirSync(courses)) {
      const evals = join(courses, c, "evaluations");
      if (!existsSync(evals)) continue;
      for (const e of readdirSync(evals)) if (existsSync(join(evals, e, "evaluation.yaml"))) out.push({ name: `${s}/${c}/${e}`, url: `/s/${s}/c/${c}/e/${e}` });
    }
  }
  }
  return [...new Map(out.map((p) => [p.url, p])).values()];
}
