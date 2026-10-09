/**
 * User progress: the set of node ids whose own flag is on. Optimistic: the UI updates instantly,
 * the server is told in the background, and a failure rolls back and surfaces a toast.
 */
import { create } from "zustand";
import { api } from "@/api/client";
import { applyChange, type FlagChange } from "@/core/progress";
import { toast } from "./toast";
import { translate } from "@/i18n";

interface ProgressStore {
  done: ReadonlySet<string>;
  loaded: boolean;
  load: () => Promise<void>;
  apply: (change: FlagChange) => void;
}

export const useProgress = create<ProgressStore>((set, get) => ({
  done: new Set(),
  loaded: false,
  async load() {
    try {
      const { done } = await api.progress.get();
      set({ done: new Set(done), loaded: true });
    } catch {
      set({ loaded: true });
      toast(translate("progress.offline"), "error");
    }
  },
  apply(change) {
    if (!change.set.length && !change.unset.length) return;
    const before = get().done;
    set({ done: applyChange(before, change) });
    api.progress.change(change).catch(() => {
      set({ done: applyChange(get().done, { set: change.unset, unset: change.set }) });
      toast(translate("progress.saveFailed"), "error");
    });
  },
}));
