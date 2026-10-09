/** Auto-discovers LLM actions (one file each). */
import { registerModules } from "@/core/registry";
import { actionRegistry, type ActionDef } from "../registry";

registerModules<ActionDef>(actionRegistry, import.meta.glob(["./*.ts", "!./index.ts", "!./*.test.ts"], { eager: true }));

export { actionRegistry };
