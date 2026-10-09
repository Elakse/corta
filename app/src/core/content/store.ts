import { create } from "zustand";
import { buildContent, type RawFiles } from "./build";
import type { ContentGraph } from "./types";

interface ContentStore {
  graph: ContentGraph;
  version: number;
  /** Rebuilds the graph. Called by the composition root (setup.ts) once registries are filled, and on hot reload. */
  reload: (files: RawFiles) => void;
}

const empty: ContentGraph = { semesters: [], courses: new Map(), evaluations: new Map(), nodes: new Map(), edges: [], issues: [] };

/** The loaded content graph. Rebuilt (and re-rendered) whenever a content file changes. */
export const useContent = create<ContentStore>((set, get) => ({
  graph: empty,
  version: 0,
  reload(files) {
    set({ graph: buildContent(files), version: get().version + 1 });
  },
}));

export const useGraph = () => useContent((s) => s.graph);
