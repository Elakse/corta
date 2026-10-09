/** Auto-discovers calendar event types (types/*.tsx). Adding a type = adding a file. */
import { registerModules } from "@/core/registry";
import { eventTypeRegistry, type EventTypeDef } from "./registry";

registerModules<EventTypeDef>(eventTypeRegistry, import.meta.glob("./types/*.tsx", { eager: true }));

export * from "./registry";
export * from "./derive";
