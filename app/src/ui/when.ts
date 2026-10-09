import { translate } from "@/i18n";
import { daysBetween, todayISO } from "@/views/format";

/** "hoy" / "mañana" / "en 5 días" / "hace 3 días". */
export function relativeDay(date: string, locale: string, today = todayISO()): string {
  const d = daysBetween(today, date);
  const rtf = new Intl.RelativeTimeFormat(locale === "es" ? "es-AR" : locale, { numeric: "auto" });
  if (d === 0) return translate("priority.today", undefined, locale);
  if (d === 1) return translate("priority.tomorrow", undefined, locale);
  return rtf.format(d, "day");
}
