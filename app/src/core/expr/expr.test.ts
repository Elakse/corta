import { describe, expect, it } from "vitest";
import { compile, evalNum, exprVars } from ".";

describe("expr", () => {
  it("finds variables, ignoring Math and params", () => {
    expect(exprVars("k * sin(x) + PI + Math.cos(theta)", ["x"])).toEqual(["k", "theta"]);
    expect(exprVars(3)).toEqual([]);
  });
  it("evaluates with vars and params", () => {
    expect(compile("k * x + sqrt(4)", ["x"])([3], { k: 2 })).toBe(8);
    expect(evalNum("cos(theta)", { theta: 0 })).toBe(1);
    expect(evalNum("bad(", {}, {}, 7)).toBe(7);
  });
});
