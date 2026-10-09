/** Auto-discovers every shape: one `<name>.shape.ts` per outline, default-exporting a defineShape(...). */
import { registerModules } from "@/core/registry";
import { shapeRegistry, type ShapeDef } from "./registry";

registerModules<ShapeDef>(shapeRegistry, import.meta.glob("./*.shape.ts", { eager: true }));

export * from "./registry";
