import { describe, expect, it } from "vitest";
import { applyChange, isComplete, progress, root, status, toggle, type PNode } from "./engine";

// section (container) → def, thm → proof ; practice (container) → ex
const leaf = (id: string, ownSize = 1, weight?: number): PNode => ({ id, container: false, ownSize, weight, children: [] });
const thm: PNode = { id: "thm", container: false, ownSize: 2, children: [leaf("proof", 2)] };
const section: PNode = { id: "sec", container: true, ownSize: 0, children: [leaf("def"), thm] };
const practice: PNode = { id: "pr", container: true, ownSize: 0, children: [leaf("ex", 1, 3)] };
const page = root("eval", [section, practice]);

describe("progress engine", () => {
  it("starts empty", () => {
    expect(status(page, new Set())).toBe("none");
    expect(progress(page, new Set())).toBe(0);
  });

  it("checking a parent sets its whole subtree", () => {
    const flags = applyChange(new Set(), toggle(thm, new Set()));
    expect([...flags].sort()).toEqual(["proof", "thm"]);
    expect(isComplete(thm, flags)).toBe(true);
    expect(status(section, flags)).toBe("partial");
  });

  it("checking a child only affects its subtree; parent becomes partial", () => {
    const flags = applyChange(new Set(), toggle(thm.children[0]!, new Set()));
    expect([...flags]).toEqual(["proof"]);
    expect(status(thm, flags)).toBe("partial");
  });

  it("unchecking a child of a complete parent makes it partial", () => {
    let flags = applyChange(new Set(), toggle(section, new Set()));
    expect(status(section, flags)).toBe("done");
    flags = applyChange(flags, toggle(thm.children[0]!, flags));
    expect(status(thm, flags)).toBe("partial");
    expect(status(section, flags)).toBe("partial");
  });

  it("containers are complete when all children are", () => {
    const flags = new Set(["def", "thm", "proof"]);
    expect(isComplete(section, flags)).toBe(true);
    expect(toggle(section, flags)).toEqual({ set: [], unset: ["def", "thm", "proof"] });
  });

  it("weights progress by size × weight multiplier", () => {
    // section size = def 1 + thm(2 + proof 2) = 5; practice = ex 1 × 3 = 3
    expect(progress(page, new Set(["ex"]))).toBeCloseTo(3 / 8);
    expect(progress(page, new Set(["def"]))).toBeCloseTo(1 / 8);
    expect(progress(thm, new Set(["proof"]))).toBeCloseTo(2 / 4);
    expect(progress(page, new Set(["def", "thm", "proof", "ex"]))).toBe(1);
  });
});
