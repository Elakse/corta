/**
 * Auto-discovers every block: each folder's index.ts(x) default-exports one defineBlock(...).
 * Adding a block = adding a folder (see docs/guides/add-a-block.md). Nothing else changes.
 */
import { blockRegistry, registerModules, type BlockDef } from "@/core/registry";

registerModules<BlockDef>(blockRegistry, import.meta.glob("./*/index.{ts,tsx}", { eager: true }));

export { blockRegistry };
