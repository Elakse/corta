import { describe, expect, it } from "vitest";
import { createVarsStore } from "./store";

describe("vars store", () => {
  it("sets and keeps identity when unchanged", () => {
    const s = createVarsStore({ theta: 20 });
    const before = s.getState().values;
    s.getState().set("theta", 20);
    expect(s.getState().values).toBe(before);
    s.getState().set("theta", 45);
    expect(s.getState().values.theta).toBe(45);
  });
});
