/**
 * npm run coverage -- <course dir> [--scope parcial-1]
 * Fails when processed/coverage.md has unresolved items: every row of the "## Items" table must map to
 * existing node ids (last column), or be explicitly out of scope ("⏭ reason"). ❌ or empty = unresolved.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { withApp, ROOT } from "./lib/app";
import { parseItems } from "./lib/coverage";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) {
  console.error("usage: npm run coverage -- content/semesters/<semester>/courses/<course>");
  process.exit(2);
}
const file = resolve(ROOT, dir, "processed/coverage.md");
if (!existsSync(file)) {
  console.error(`missing ${file}`);
  process.exit(1);
}

const rows = parseItems(readFileSync(file, "utf8"));
if (!rows.length) {
  console.error(`${file}: no "## Items" table found`);
  process.exit(1);
}

const code = await withApp(({ getGraph }) => {
  const g = getGraph();
  let bad = 0, covered = 0, skipped = 0;
  for (const r of rows) {
    const last = r.cells.at(-1) ?? "";
    const label = r.cells[1] ?? r.cells[0];
    if (last.startsWith("⏭")) {
      skipped++;
      continue;
    }
    const ids = [...last.matchAll(/`?([a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+)`?/g)].map((m) => m[1]!);
    const missing = ids.filter((id) => !g.nodes.has(id));
    if (last.includes("❌") || !ids.length || missing.length) {
      bad++;
      console.log(`  ✗ line ${r.line}: ${label}${missing.length ? `  (unknown ids: ${missing.join(", ")})` : last.includes("❌") ? "  (marked missing)" : "  (no node ids)"}`);
    } else covered++;
  }
  console.log(`\ncoverage: ${covered} covered, ${skipped} out of scope, ${bad} unresolved  (${rows.length} items)`);
  return bad ? 1 : 0;
});
process.exit(code);
