import type { CanvasModuleProps } from "@/blocks/canvas/types";
export default function MathLabels({ kit, height }: CanvasModuleProps) {
  const { Plane, Label } = kit;
  return <Plane height={height} x={[0, 4]} y={[0, 2]} label="Math labels">
    <Label at={[.3, 1]}>{"$F_X^{-1}(u)$"}</Label>
  </Plane>;
}
