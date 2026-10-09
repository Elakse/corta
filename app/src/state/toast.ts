import { create } from "zustand";

export type ToastKind = "info" | "success" | "error";
export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

export const useToasts = create<{ items: Toast[]; dismiss: (id: number) => void }>((set) => ({
  items: [],
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

let seq = 0;
export function toast(text: string, kind: ToastKind = "info", ms = 4200): void {
  const id = ++seq;
  useToasts.setState((s) => ({ items: [...s.items, { id, text, kind }] }));
  setTimeout(() => useToasts.getState().dismiss(id), ms);
}
