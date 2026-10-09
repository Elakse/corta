/**
 * npm run new-block -- <type> [--group visual|content|layout|control|practice|freeform] [--snap]
 * Scaffolds app/src/blocks/<type>/ (definition + view). Then: fill schema/docs/example, run `npm run catalog`.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib/app";

const args = process.argv.slice(2);
const type = args.find((a) => !a.startsWith("--"));
const group = args[args.indexOf("--group") + 1] && args.includes("--group") ? args[args.indexOf("--group") + 1] : "content";
const snap = args.includes("--snap");
if (!type || !/^[a-z][a-z0-9]*$/.test(type)) {
  console.error("usage: npm run new-block -- <type> [--group visual] [--snap]   (type: lowercase letters/digits, e.g. timeline)");
  process.exit(1);
}
const dir = resolve(ROOT, "app/src/blocks", type);
if (existsSync(dir)) {
  console.error(`app/src/blocks/${type} already exists`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const Name = type[0]!.toUpperCase() + type.slice(1);
writeFileSync(
  resolve(dir, "index.tsx"),
  `import { z } from "zod";
import { defineBlock } from "@/core/registry";
import { ${Name}View } from "./View";

const schema = z
  .object({
    // TODO: the props the agent writes in YAML
    label: z.string(),
  })
  .strict();
export type ${Name}Props = z.infer<typeof schema>;

export default defineBlock<${Name}Props>({
  type: "${type}",
  version: 1,
  group: "${group}",
  schema,
  component: ${Name}View,
  ruler: "${snap ? "snap" : "self"}",${snap ? "\n  card: true," : ""}
  // reads: (p) => [...],   // page variables it consumes
  // writes: (p) => [...],  // page variables it changes
  // markup: (p) => [...],  // inline-markup strings (tall-math rule, {{var}})
  describe: (p) => \`[${type}] \${p.label}\`,
  docs: \`TODO: what it is, when the skill should use it, and its rules.\`,
  example: \`- ${type}: { label: "TODO" }\`,
});
`,
);
writeFileSync(
  resolve(dir, "View.tsx"),
  `import type { BlockComponentProps } from "@/core/registry";
import type { ${Name}Props } from "./index";

export function ${Name}View({ props }: BlockComponentProps<${Name}Props>) {
  ${snap ? "// snapped: the ruler rounds this block's height up to whole lines" : "// line holder: mark every line of text with data-rl=\"text\" (or \"math\" / \"table\") so the ruler aligns it"}
  return <${snap ? "div" : 'p data-rl="text"'}>{props.label}</${snap ? "div" : "p"}>;
}
`,
);
console.log(`created app/src/blocks/${type}/ (index.tsx, View.tsx)
next:
  1. define the schema, docs and example in index.tsx; build the view
  2. npm run catalog      (the skill and docs/content-format.md learn about it)
  3. npm test && npm run ruler   (the example must validate; text must sit on the lines)`);
