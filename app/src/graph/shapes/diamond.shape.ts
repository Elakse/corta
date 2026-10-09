import { defineShape } from "./registry";

export default defineShape({
  key: "diamond",
  // a text box of w×h fits when w/W + h/H <= 1
  size: (t) => ({ w: Math.ceil(t.w * 1.5) + 44, h: Math.max(60, Math.ceil(t.h * 1.6) + 40) }),
  halfExtent: (b, axis, offset) => {
    const own = (axis === "x" ? b.w : b.h) / 2, other = (axis === "x" ? b.h : b.w) / 2;
    return own * Math.max(0, 1 - Math.abs(offset) / other);
  },
  path: ({ w, h }) => `M0,${-h / 2} L${w / 2},0 L0,${h / 2} L${-w / 2},0 Z`,
});
