import { describe, expect, it } from "vitest";
import "@/kinds";
import "@/blocks";
import { buildContent } from "@/core/content/build";
import strategy, { pressure } from "./deadline-pressure";

const files = (evals: string) => ({
  "content/semesters/s/semester.yaml": "schema: 1\nid: s\nlabel: S\nstart: 2026-08-01\nend: 2026-12-31\ncourses: [a]\n",
  "content/semesters/s/courses/a/course.yaml": `schema: 1\nid: a\nname: A\nevaluations:\n${evals}`,
  "content/semesters/s/courses/a/sources.yaml": "schema: 1\nsources: []\n",
});

describe("deadline-pressure", () => {
  it("more remaining and fewer days → higher pressure; planned hours relax it", () => {
    expect(pressure(10, 2, 0)).toBeGreaterThan(pressure(10, 10, 0));
    expect(pressure(10, 5, 0)).toBeGreaterThan(pressure(5, 5, 0));
    expect(pressure(10, 5, 4)).toBeLessThan(pressure(10, 5, 0));
  });

  it("ranks upcoming evaluations, skipping past ones, far ones and future retakes", () => {
    const graph = buildContent(
      files(
        [
          "  - { id: p1, kind: midterm, title: P1, date: 2026-10-10 }",
          "  - { id: tp, kind: assignment, title: TP, date: 2026-10-30 }",
          "  - { id: old, kind: midterm, title: Old, date: 2026-09-01 }",
          "  - { id: far, kind: final, title: Far, date: 2027-03-01 }",
          "  - { id: r1, kind: retake, title: R1, date: 2026-10-20, retakes: p1 }",
          "",
        ].join("\n"),
      ),
    );
    const ranked = strategy.rank({ graph, done: new Set(), sessions: [], today: "2026-10-07" });
    expect(ranked.map((r) => r.evaluationKey)).toEqual(["s/a/p1", "s/a/tp"]);
    expect(ranked[0]!.reason.key).toBe("priority.reasonNoContent");
  });
});
