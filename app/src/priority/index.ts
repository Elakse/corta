/** Auto-discovers priority strategies (strategies/*.ts). */
import { registerModules } from "@/core/registry";
import { strategyRegistry, type PriorityStrategy } from "./registry";

registerModules<PriorityStrategy>(strategyRegistry, import.meta.glob(["./strategies/*.ts", "!./strategies/*.test.ts"], { eager: true }));

export * from "./registry";
