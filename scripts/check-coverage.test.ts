import { describe, expect, it } from "vitest";
import { parseItems } from "./lib/coverage";

describe("coverage parser", () => {
  it("reads only the Items table, skipping header and separator", () => {
    const md = "# x\n\n## Items\n\n| # | Item | Source | Nodes |\n|---|---|---|---|\n| 1 | A | prog | `c/p1/a` |\n| 2 | B | prog | ❌ |\n\n## Notes\n| not | this |";
    expect(parseItems(md).map((r) => r.cells[1])).toEqual(["A", "B"]);
    expect(parseItems("no table")).toEqual([]);
  });
});
