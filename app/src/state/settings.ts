/** User settings persisted in SQLite (paper type per evaluation, theme, locale, priority strategy…). */
import { create } from "zustand";
import { api } from "@/api/client";
import { setThemeMode, type ThemeMode } from "@/theme";

interface SettingsStore {
  values: Record<string, unknown>;
  loaded: boolean;
  load: () => Promise<void>;
  set: (key: string, value: unknown) => void;
}

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
    set({ values: { ...get().values, [key]: value } });
    if (key === "theme") setThemeMode(value as ThemeMode);
    api.settings.set(key, value).catch(() => undefined);
  },
}));

export function useSetting<T>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useSettings((s) => s.values[key]) as T | undefined;
  const setter = useSettings((s) => s.set);
  return [value ?? fallback, (v: T) => setter(key, v)];
}
