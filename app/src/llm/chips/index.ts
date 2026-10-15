/** Auto-discovers chat chips (one file each). */
import { registerModules } from "@/core/registry";
import { chipRegistry, type ChipDef } from "../chip-registry";

registerModules<ChipDef>(chipRegistry, import.meta.glob(["./*.ts", "!./index.ts", "!./*.test.ts"], { eager: true }));

export { chipRegistry };
