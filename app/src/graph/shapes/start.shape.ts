import { circlePath, defineShape } from "./registry";

/** State-diagram initial pseudo-state: a solid dot. */
export default defineShape({
  key: "start",
  size: () => ({ w: 20, h: 20 }),
  halfExtent: (b, _axis, offset) => Math.sqrt(Math.max(0, (b.w / 2) ** 2 - offset ** 2)),
  path: (b) => circlePath(b.w / 2),
  className: "filled",
  noLabel: true,
});
