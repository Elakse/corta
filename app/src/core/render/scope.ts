import { createContext, useContext } from "react";

/** Where a block lives: which node, which evaluation folder, which language. Provided by the page. */
export interface NodeScopeValue {
  nodeId: string;
  evaluationDir: string;
  language: string;
}

export const NodeScope = createContext<NodeScopeValue>({ nodeId: "", evaluationDir: "", language: "es" });
export const useNodeScope = () => useContext(NodeScope);
