/** Date helpers. Dates in content are local calendar dates (YYYY-MM-DD), never UTC instants. */
import { intlLocale } from "@/i18n";

export const parseDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
};
export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayISO = () => toISODate(new Date());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysBetween = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);

export function fmtDate(d: string, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(parseDate(d));
}

/** Notebook header style: "Jue 13 / 11". */
export function fmtNotebookDate(d: string, locale: string) {
  const date = parseDate(d);
  const wd = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short" }).format(date).replace(".", "");
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${date.getDate()} / ${date.getMonth() + 1}`;
}

export const pct = (x: number) => `${Math.round(x * 100)} %`;
