import { create } from "zustand";
import type { StudySession, StudySessionInput } from "@shared/api";
import { api } from "@/api/client";
import { toast } from "./toast";

interface SessionsStore {
  items: StudySession[];
  loaded: boolean;
  load: () => Promise<void>;
  save: (input: StudySessionInput, id?: string) => Promise<StudySession | null>;
  remove: (id: string) => Promise<void>;
}

/** Planned study sessions (user state; they show up in the calendar as derived events). */
export const useSessions = create<SessionsStore>((set, get) => ({
  items: [],
  loaded: false,
  async load() {
    try {
      const { sessions } = await api.sessions.list();
      set({ items: sessions, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  async save(input, id) {
    try {
      const s = id ? await api.sessions.update(id, input) : await api.sessions.create(input);
      set({ items: id ? get().items.map((x) => (x.id === id ? s : x)) : [...get().items, s] });
      return s;
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
      return null;
    }
  },
  async remove(id) {
    const before = get().items;
    set({ items: before.filter((x) => x.id !== id) });
    try {
      await api.sessions.remove(id);
    } catch (e) {
      set({ items: before });
      toast(e instanceof Error ? e.message : String(e), "error");
    }
  },
}));
