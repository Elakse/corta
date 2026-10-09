import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import "@/kinds";
import "@/blocks";
import { blockRegistry } from "@/core/registry";
import { buildContent, type RawFiles } from "./build";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function readContent(): RawFiles {
  const out: RawFiles = {};
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(f)) out[relative(ROOT, p).replace(/\\/g, "/")] = readFileSync(p, "utf8");
    }
  };
  walk(join(ROOT, "tests/fixtures/content/semesters"));
  return out;
}

const base = "content/semesters/t";
function fixture(topic: string, extra: RawFiles = {}): RawFiles {
  return {
    [`${base}/semester.yaml`]: "schema: 1\nid: t\nlabel: T\nstart: 2026-01-01\nend: 2026-06-30\ncourses: [c]\n",
    [`${base}/courses/c/course.yaml`]: "schema: 1\nid: c\nname: C\nevaluations:\n  - { id: p1, kind: midterm, title: P1, date: 2026-05-01 }\n",
    [`${base}/courses/c/sources.yaml`]: "schema: 1\nsources:\n  - { id: guia-1, path: sources/guides/g1.pdf, kind: guide, title: Guía 1 }\n",
    [`${base}/courses/c/evaluations/p1/evaluation.yaml`]: "schema: 1\nid: p1\ntitle: P1\ntopics: [t.yaml]\n",
    [`${base}/courses/c/evaluations/p1/topics/t.yaml`]: topic,
    ...extra,
  };
}
const topic = (body: string, head = "") => `schema: 1\nid: c/p1/t\nkind: section\ntitle: T\n${head}body:\n${body}`;
const messages = (files: RawFiles) => buildContent(files).issues.map((i) => `${i.severity}: ${i.message}${i.hint ? ` (${i.hint})` : ""}`);

describe("content loader", () => {
  it("loads the synthetic test content without errors", () => {
    const g = buildContent(readContent());
    expect(g.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(g.nodes.size).toBeGreaterThan(5);
  });

  it("builds the ID graph with parents, children and relations", () => {
    const g = buildContent(fixture(topic(`  - node:\n      id: c/p1/t/a\n      kind: definition\n      body: [ { text: hola } ]\n  - node:\n      id: c/p1/t/b\n      kind: theorem\n      relations: [ { type: prerequisite, target: c/p1/t/a } ]\n      body: [ { text: chau } ]\n`)));
    expect(g.issues).toEqual([]);
    const b = g.nodes.get("c/p1/t/b")!;
    expect(b.node.parentId).toBe("c/p1/t");
    expect(b.node.depth).toBe(1);
    expect(g.nodes.get("c/p1/t")!.node.children.map((c) => c.id)).toEqual(["c/p1/t/a", "c/p1/t/b"]);
    expect(g.edges).toEqual([{ from: "c/p1/t/b", to: "c/p1/t/a", type: "prerequisite" }]);
  });

  it("suggests the right block for a typo", () => {
    expect(messages(fixture(topic("  - graf2d: {}\n"))).join("\n")).toMatch(/unknown block type "graf2d".*graph2d/);
  });

  it("rejects unknown kinds, duplicate ids, bad ids and unknown sources", () => {
    const m = messages(
      fixture(
        topic(
          `  - node: { id: c/p1/t/a, kind: theorm, body: [] }\n  - node: { id: c/p1/t/a, kind: definition, body: [] }\n  - node: { id: "C/Bad Id", kind: definition, body: [] }\n  - node: { id: c/p1/t/s, kind: definition, sources: [ { ref: nope, basis: explicit } ], body: [] }\n`,
        ),
      ),
    ).join("\n");
    expect(m).toMatch(/unknown node kind "theorm".*theorem/);
    expect(m).toMatch(/duplicate node id "c\/p1\/t\/a"/);
    expect(m).toMatch(/kebab-case/);
    expect(m).toMatch(/source "nope" isn't registered/);
  });

  it("warns on tall inline math and orphan relations", () => {
    const m = messages(fixture(topic(`  - text: 'mal $\\frac{a}{b}$'\n`, "relations: [ { type: related, target: c/p1/nada } ]\n"))).join("\n");
    expect(m).toMatch(/warning: tall inline math/);
    expect(m).toMatch(/warning: relation target "c\/p1\/nada" doesn't exist/);
  });

  it("requires page variables to be declared", () => {
    expect(messages(fixture(topic(`  - text: "θ = {{theta}}"\n  - slider: { var: k, min: 0, max: 1 }\n`))).join("\n")).toMatch(/"theta" that no node declares[\s\S]*"k" that no node declares/);
    expect(messages(fixture(topic(`  - text: "θ = {{theta}}"\n`, "vars: { theta: 1 }\n")))).toEqual([]);
  });

  it("validates nested blocks and forbids nodes inside blocks", () => {
    const m = messages(fixture(topic(`  - collapsible:\n      label: x\n      body:\n        - tabel: {}\n        - node: { id: c/p1/t/z, kind: definition, body: [] }\n`))).join("\n");
    expect(m).toMatch(/unknown block type "tabel".*table/);
    expect(m).toMatch(/nodes can't be nested inside blocks/);
  });

  it("enforces exercise rules (origin + exercise block)", () => {
    const m = messages(fixture(topic(`  - node: { id: c/p1/t/e, kind: exercise, body: [ { text: x } ] }\n`))).join("\n");
    expect(m).toMatch(/origin/);
    expect(m).toMatch(/needs one `exercise` block/);
  });

  it("reports YAML syntax errors readably", () => {
    expect(messages(fixture("schema: 1\nid: [unclosed\n"))[0]).toMatch(/YAML syntax error/);
  });

  it("every block's catalog example is valid content", () => {
    for (const def of blockRegistry.list()) {
      const items = parse(def.example) as unknown[];
      const declared = new Set<string>();
      const names = JSON.stringify(items).match(/\b[a-zA-Z_]\w*\b/g) ?? [];
      names.forEach((n) => declared.add(n));
      const vars = Object.fromEntries([...declared].filter((n) => /^[A-Za-z_]\w*$/.test(n)).map((n) => [n, 0]));
      const node = { schema: 1, id: "c/p1/t", kind: "section", vars, body: items };
      const files = fixture(JSON.stringify(node));
      const errors = buildContent(files).issues.filter((i) => i.severity === "error");
      expect(errors, `example of ${def.type}`).toEqual([]);
    }
  });
});
