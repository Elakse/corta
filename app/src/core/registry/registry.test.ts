import { describe, expect, it } from "vitest";
import { createRegistry, registerModules } from "./registry";

describe("registry", () => {
  const make = () => createRegistry<{ type: string }>("test", (d) => d.type);
  it("registers, gets and lists", () => {
    const r = make();
    r.register({ type: "a" });
    expect(r.get("a")).toEqual({ type: "a" });
    expect(r.keys()).toEqual(["a"]);
  });
  it("rejects duplicates", () => {
    const r = make();
    r.register({ type: "a" });
    expect(() => r.register({ type: "a" })).toThrow(/duplicate/);
  });
  it("suggests close keys", () => {
    const r = make();
    r.register({ type: "graph2d" });
    r.register({ type: "table" });
    expect(r.suggest("graf2d")).toEqual(["graph2d"]);
  });
  it("registers default exports, single or array", () => {
    const r = make();
    registerModules(r, { "./x.ts": { default: { type: "x" } }, "./y.ts": { default: [{ type: "y1" }, { type: "y2" }] } });
    expect(r.keys().sort()).toEqual(["x", "y1", "y2"]);
  });
});
