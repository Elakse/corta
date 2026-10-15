/**
 * Graphics kit: the "legos" canvas modules use to draw on-style graphics. Everything reads the design tokens.
 * Canvas modules receive it as `kit` (see docs/guides/add-a-block.md#canvas and the canvas block docs).
 */
import { Plane, usePlane } from "./Plane";
import { Axes, Curve, Grid, Label, Point, Segment, Shape, Transition, Vector } from "./primitives";
import { DensityField } from "./DensityField";
import { MathText, SvgMathLabel } from "@/ui/MathText";

export const kit = { Plane, usePlane, Grid, Axes, Segment, Vector, Point, Label, Curve, Shape, Transition, DensityField, MathText, SvgMathLabel };
export { MathText, SvgMathLabel };
export type Kit = typeof kit;
export * from "./Plane";
export * from "./primitives";
export * from "./paths";
export * from "./DensityField";
