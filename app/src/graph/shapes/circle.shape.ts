import { circlePath, defineShape } from "./registry";

export default defineShape({
  key: "circle",
  size: (t) => {
    const r = Math.max(25, Math.ceil(Math.hypot(t.w / 2, t.h / 2)) + 8);
    return { w: r * 2, h: r * 2 };
  },
  halfExtent: (b, _axis, offset) => Math.sqrt(Math.max(0, (b.w / 2) ** 2 - offset ** 2)),
  path: (b) => circlePath(b.w / 2),
});
