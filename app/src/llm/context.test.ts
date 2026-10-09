import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import "@/kinds";
import "@/blocks";
import { buildContent } from "@/core/content/build";
import { buildContext } from "./context";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const files: Record<string, string> = {};
const walk = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".yaml")) files[relative(ROOT, p)] = readFileSync(p, "utf8");
  }
};
walk(join(ROOT, "tests/fixtures/content/semesters/_sample"));

describe("LLM context builder", () => {
  const graph = buildContent(files);
  it("describes the selected node with blocks, sources and live variables", () => {
    const ctx = buildContext({
      graph,
      path: "/s/_sample/c/algebra/e/parcial-1",
      selected: "alg/p1/autoval/def",
      visible: { "alg/p1/autoval/def": 1, "alg/p1/autoval/pol-car": 0.5 },
      vars: { theta: 45 },
      done: new Set(["alg/p1/autoval/def"]),
      today: "2026-10-07",
    });
    expect(ctx.focus?.id).toBe("alg/p1/autoval/def");
    expect(ctx.text).toContain("Autovalor y autovector");
    expect(ctx.text).toContain("learned");
    expect(ctx.text).toContain("Apunte de la Unidad 3 p.12 [explicit]");
    expect(ctx.text).toContain("theta = 45");
    expect(ctx.text).toContain("Polinomio característico");
  });
  it("falls back to the most visible node", () => {
    const ctx = buildContext({ graph, path: "/s/_sample/c/algebra/e/parcial-1", selected: null, visible: { "alg/p1/autoval": 1, "alg/p1/autoval/thm-li": 0.8 }, vars: {}, done: new Set(), today: "2026-10-07" });
    expect(ctx.focus?.id).toBe("alg/p1/autoval/thm-li");
  });
});
