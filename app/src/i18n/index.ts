import { useSettings } from "@/state/settings";
import { dictionaries, type StringKey } from "./strings";

export type { StringKey };
export const DEFAULT_LOCALE = "es";

const fill = (s: string, params?: Record<string, string | number>) =>
  params ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`)) : s;

export function currentLocale(): string {
  const l = useSettings.getState().values.locale;
  return typeof l === "string" && dictionaries[l] ? l : DEFAULT_LOCALE;
}

/** Non-React translation (stores, utilities). */
export function translate(key: StringKey, params?: Record<string, string | number>, locale = currentLocale()): string {
  return fill(dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE]![key] ?? key, params);
}

export function useLocale(): string {
  const l = useSettings((s) => s.values.locale);
  return typeof l === "string" && dictionaries[l] ? l : DEFAULT_LOCALE;
}

export function useT() {
  const locale = useLocale();
  return (key: StringKey, params?: Record<string, string | number>) => translate(key, params, locale);
}

/** BCP-47 tag for Intl formatting. */
export const intlLocale = (l: string) => (l === "es" ? "es-AR" : l === "en" ? "en-US" : l);
