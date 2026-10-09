/**
 * Shared page variables ("spreadsheet cells"). Page-scoped: each evaluation page creates one store from
 * the `vars` its nodes declare. Blocks read/write them through these hooks; their registry entries declare
 * which ones (`reads` / `writes`) so the validator and the LLM context know the wiring.
 */
import { createContext, createElement, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { VarValue } from "../content/schemas";

export interface VarsState {
  values: Record<string, VarValue>;
  set: (name: string, value: VarValue) => void;
  reset: (values: Record<string, VarValue>) => void;
}
export type VarsStore = StoreApi<VarsState>;

export function createVarsStore(initial: Record<string, VarValue> = {}): VarsStore {
  return createStore<VarsState>((set) => ({
    values: { ...initial },
    set: (name, value) => set((s) => (s.values[name] === value ? s : { values: { ...s.values, [name]: value } })),
    reset: (values) => set({ values: { ...values } }),
  }));
}

const fallback = createVarsStore();
const VarsContext = createContext<VarsStore>(fallback);

/** Provides a page-scoped store; recreated only when `scope` changes (e.g. another evaluation). */
export function VarsProvider({ scope, initial, children }: { scope: string; initial: Record<string, VarValue>; children: ReactNode }) {
  const ref = useRef<{ scope: string; store: VarsStore } | null>(null);
  if (!ref.current || ref.current.scope !== scope) ref.current = { scope, store: createVarsStore(initial) };
  const store = ref.current.store;
  // content hot-reload may declare new variables: add them without resetting the ones in use
  useEffect(() => {
    const s = store.getState();
    for (const [k, v] of Object.entries(initial)) if (!(k in s.values)) s.set(k, v);
  }, [store, initial]);
  return createElement(VarsContext.Provider, { value: ref.current.store }, children);
}

export const useVarsStore = () => useContext(VarsContext);

export function useVar<T extends VarValue = VarValue>(name: string): [T | undefined, (v: T) => void] {
  const store = useVarsStore();
  const value = useStore(store, (s) => s.values[name]) as T | undefined;
  const setter = useMemo(() => (v: T) => store.getState().set(name, v), [store, name]);
  return [value, setter];
}

/** Subscribes to several variables at once (re-renders only when one of them changes). */
export function useVarValues(names: readonly string[]): Record<string, VarValue> {
  const store = useVarsStore();
  return useStore(
    store,
    useShallow((s) => {
      const out: Record<string, VarValue> = {};
      for (const n of names) if (s.values[n] !== undefined) out[n] = s.values[n]!;
      return out;
    }),
  );
}

export function useSetVar(): (name: string, value: VarValue) => void {
  const store = useVarsStore();
  return useMemo(() => (n, v) => store.getState().set(n, v), [store]);
}
