import { create } from "zustand";
import type { LlmConfiguration, LlmSelection } from "@shared/api";
import { api } from "@/api/client";

/** Shared by preferences and chat; credentials remain on the server. */
export const useLlmConnection = create<{
  config: LlmConfiguration | null;
  loading: boolean;
  selecting: boolean;
  busy: boolean;
  error: boolean;
  load: () => Promise<void>;
  select: (selection: LlmSelection) => Promise<void>;
}>((set, get) => ({
  config: null, loading: false, selecting: false, busy: false, error: false,
  async load() {
    if (get().loading || get().selecting) return;
    set({ loading: true, error: false });
    try { set({ config: await api.llm.configuration() }); }
    catch { set({ error: true }); }
    finally { set({ loading: false }); }
  },
  async select(selection) {
    if (get().selecting || get().busy) return;
    set({ selecting: true, error: false });
    try { set({ config: await api.llm.select(selection) }); }
    catch { set({ error: true }); }
    finally { set({ selecting: false }); }
  },
}));
