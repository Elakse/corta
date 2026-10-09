import { circlePath, defineShape } from "./registry";

/** State-diagram final pseudo-state: a ring around a solid dot. */
export default defineShape({
  key: "end",
  size: () => ({ w: 26, h: 26 }),
  halfExtent: (b, _axis, offset) => Math.sqrt(Math.max(0, (b.w / 2) ** 2 - offset ** 2)),
  path: (b) => circlePath(b.w / 2),
  deco: (b) => [circlePath(b.w / 2 - 6)],
  className: "ring",
  noLabel: true,
});
