/**
 * npm run validate — checks every content file: schemas, IDs (format + global uniqueness), source refs,
 * kinds, block props, page variables, tall-math rule, orphan relations. Exit code 1 on any error.
 * Same checks the app runs when it loads content.
 */
import { withApp } from "./lib/app";

const c = { red: "\x1b[31m", yellow: "\x1b[33m", dim: "\x1b[2m", green: "\x1b[32m", bold: "\x1b[1m", reset: "\x1b[0m" };

const code = await withApp(({ getGraph }) => {
  const g = getGraph();
  const nodes = g.nodes.size;
  console.log(`${c.bold}Corta content${c.reset}  ${g.semesters.length} semester(s) · ${g.courses.size} course(s) · ${g.evaluations.size} evaluation(s) · ${nodes} node(s)`);
  const byFile = new Map<string, typeof g.issues>();
  for (const i of g.issues) byFile.set(i.file, [...(byFile.get(i.file) ?? []), i]);
  for (const [file, list] of byFile) {
    console.log(`\n${c.bold}${file}${c.reset}`);
    for (const i of list) {
      const color = i.severity === "error" ? c.red : c.yellow;
      console.log(`  ${color}${i.severity}${c.reset} ${i.path ? `${c.dim}${i.path}${c.reset} ` : ""}${i.message}`);
      if (i.hint) console.log(`        ${c.dim}→ ${i.hint}${c.reset}`);
    }
  }
  const errors = g.issues.filter((i) => i.severity === "error").length;
  const warnings = g.issues.length - errors;
  console.log(`\n${errors ? c.red : c.green}${errors} error(s)${c.reset}, ${warnings ? c.yellow : ""}${warnings} warning(s)${c.reset}`);
  return errors ? 1 : 0;
});
process.exit(code);
