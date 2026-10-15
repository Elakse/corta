/** User settings persisted in SQLite (paper type per evaluation, theme, locale, priority strategy…). */
import { create } from "zustand";
import { api } from "@/api/client";
import { setThemeMode, type ThemeMode } from "@/theme";

interface SettingsStore {
  values: Record<string, unknown>;
  loaded: boolean;
  load: () => Promise<void>;
  set: (key: string, value: unknown) => void;
  /** Updates the value now and saves it once the changes stop (sliders, drags). */
  setDebounced: (key: string, value: unknown, delay?: number) => void;
  /** Saves a pending debounced value immediately (when a dialog closes). */
  flush: (key: string) => void;
}

const pending = new Map<string, ReturnType<typeof setTimeout>>();

export const useSettings = create<SettingsStore>((set, get) => ({
  values: {},
  loaded: false,
  async load() {
    try {
      const values = await api.settings.all();
      set({ values, loaded: true });
      setThemeMode((values.theme as ThemeMode) ?? "system");
    } catch {
      set({ loaded: true });
    }
  },
  set(key, value) {
    clearTimeout(pending.get(key));
    pending.delete(key);
    set({ values: { ...get().values, [key]: value } });
    if (key === "theme") setThemeMode(value as ThemeMode);
    api.settings.set(key, value).catch(() => undefined);
  },
  setDebounced(key, value, delay = 350) {
    clearTimeout(pending.get(key));
    set({ values: { ...get().values, [key]: value } });
    pending.set(key, setTimeout(() => get().flush(key), delay));
  },
  flush(key) {
    const timer = pending.get(key);
    if (timer === undefined) return;
    clearTimeout(timer);
    pending.delete(key);
    api.settings.set(key, get().values[key]).catch(() => undefined);
  },
}));

export function useSetting<T>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useSettings((s) => s.values[key]) as T | undefined;
  const setter = useSettings((s) => s.set);
  return [value === undefined ? fallback : value, (v: T) => setter(key, v)];
}
