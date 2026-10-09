import { describe, expect, it } from "vitest";
import { weeklyDates } from "./derive";

describe("calendar derivation", () => {
  it("expands weekly slots, skipping exceptions", () => {
    // 2026-10-05 is a Monday
    expect(weeklyDates("mon", "2026-10-01", "2026-10-26", new Set(["2026-10-12"]))).toEqual(["2026-10-05", "2026-10-19", "2026-10-26"]);
    expect(weeklyDates("thu", "2026-10-01", "2026-10-08", new Set())).toEqual(["2026-10-01", "2026-10-08"]);
  });
});
