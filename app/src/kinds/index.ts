/** Auto-discovers every node kind in this folder. Adding a kind = adding (or extending) a file here. */
import { kindRegistry, registerModules, type KindDef } from "@/core/registry";

registerModules<KindDef>(kindRegistry, import.meta.glob(["./*.ts", "!./index.ts", "!./*.test.ts"], { eager: true }));

export { kindRegistry };
