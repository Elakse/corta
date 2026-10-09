import { defineShape, roundedRectPath } from "./registry";

export default defineShape({
  key: "pill",
  size: (t) => ({ w: Math.ceil(t.w) + 46, h: Math.max(38, Math.ceil(t.h) + 20) }),
  // the round ends only matter very close to the corners; ports stay within the flat middle
  halfExtent: (b, axis) => (axis === "x" ? b.w : b.h) / 2,
  path: (b) => roundedRectPath(b, b.h / 2),
});
