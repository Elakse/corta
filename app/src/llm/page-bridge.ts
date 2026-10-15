import { create } from "zustand";
import type { VarsStore } from "@/core/vars";

/** The evaluation page currently open registers its variable store here so the chat and actions can reach it. */
export const usePageBridge = create<{ vars: VarsStore | null; evaluationKey: string | null; refresh: (() => void) | null }>(() => ({ vars: null, evaluationKey: null, refresh: null }));
export const pageBridge = {
  get vars() {
    return usePageBridge.getState().vars;
  },
  set: (vars: VarsStore | null, evaluationKey: string | null) => usePageBridge.setState({ vars, evaluationKey }),
};
