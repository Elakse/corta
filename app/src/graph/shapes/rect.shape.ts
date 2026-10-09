import { defineShape, roundedRectPath } from "./registry";

export default defineShape({
  key: "rect",
  size: (t) => ({ w: Math.ceil(t.w) + 40, h: Math.max(42, Math.ceil(t.h) + 24) }),
  halfExtent: (b, axis) => (axis === "x" ? b.w : b.h) / 2,
  path: (b) => roundedRectPath(b, 11),
});
