/**
 * Entry used by Node scripts (validate, catalog, coverage) through Vite's SSR loader, so registries
 * are discovered with the same import.meta.glob calls as the app. No DOM is touched here.
 */
import "./setup";
import { useContent } from "@/core/content/store";
import { blockRegistry, kindRegistry } from "@/core/registry";

export const getGraph = () => useContent.getState().graph;
export { blockRegistry, kindRegistry };
export { buildContent, walkNodes, walkBlocks } from "@/core/content/build";
