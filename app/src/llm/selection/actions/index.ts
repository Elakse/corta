/** Auto-discovers selection-menu actions (one file each). */
import { registerModules } from "@/core/registry";
import { selectionActionRegistry, type SelectionActionDef } from "../registry";

registerModules<SelectionActionDef>(selectionActionRegistry, import.meta.glob(["./*.ts", "!./index.ts", "!./*.test.ts"], { eager: true }));

export { selectionActionRegistry };
