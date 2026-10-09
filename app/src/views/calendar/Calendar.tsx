import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarSync, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { eventTypeRegistry, type CalendarEvent } from "@/calendar";
import { byDay, useCalendarEvents } from "@/calendar/useEvents";
import { syncToGoogle } from "@/calendar/gcal-sync";
import { useUi } from "@/state/ui";
import { useSetting } from "@/state/settings";
import { intlLocale, useLocale, useT } from "@/i18n";
import { motionTokens } from "@/theme";
import { addDays, fmtDate, parseDate, toISODate, todayISO } from "../format";
import { MonthGrid } from "./MonthGrid";
import { WeekGrid } from "./WeekGrid";

type Mode = "month" | "week";

const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** The big interactive calendar (Home): month/week, day selection, key-date jumps, Google push. */
export function Calendar() {
  const t = useT();
  const locale = useLocale();
  const events = useCalendarEvents();
  const days = useMemo(() => byDay(events), [events]);
  const [mode, setMode] = useSetting<Mode>("calendar.mode", "month");
  const [cursor, setCursor] = useState(() => new Date());
  const [dir, setDir] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const openDay = useUi((s) => s.openDay);
  const selected = useUi((s) => s.day);
  const today = todayISO();

  const move = (n: number) => {
    setDir(n);
    setCursor((c) => (mode === "month" ? new Date(c.getFullYear(), c.getMonth() + n, 1) : addDays(c, 7 * n)));
  };
  const goTo = (iso: string) => {
    const d = parseDate(iso);
    setDir(d > cursor ? 1 : -1);
    setCursor(d);
  };

  // keyboard: ← → move, T today
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key.toLowerCase() === "t" && !e.metaKey && !e.ctrlKey) goTo(today);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // after the OAuth redirect: confirm and push once
  const synced = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("gcal") === "connected" && !synced.current && events.length) {
      synced.current = true;
      history.replaceState(null, "", location.pathname);
      setSyncing(true);
      void syncToGoogle(events).finally(() => setSyncing(false));
    }
  }, [events]);

  const title =
    mode === "month"
      ? new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(cursor)
      : `${fmtDate(toISODate(startOfWeek(cursor)), locale, { day: "numeric", month: "short" })} – ${fmtDate(toISODate(addDays(startOfWeek(cursor), 6)), locale, { day: "numeric", month: "short", year: "numeric" })}`;
  const titleCap = title.charAt(0).toUpperCase() + title.slice(1);
  const keyDates = events.filter((e) => eventTypeRegistry.get(e.type)?.key && e.date >= today).slice(0, 12);
  const viewKey = mode === "month" ? `m-${cursor.getFullYear()}-${cursor.getMonth()}` : `w-${toISODate(startOfWeek(cursor))}`;

  return (
    <section className="cal" aria-label="calendar">
      <header className="cal-head">
        <div className="cal-title">
          <h2>{titleCap}</h2>
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => move(-1)} aria-label={t("cal.prev")}>
              <ChevronLeft size={18} />
            </button>
            <button className="icon-btn" onClick={() => move(1)} aria-label={t("cal.next")}>
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="ghost-btn" onClick={() => goTo(today)}>
            {t("cal.today")}
          </button>
        </div>
        <div className="cal-tools">
          <div className="jump">
            <button className="ghost-btn" onClick={() => setJumpOpen(!jumpOpen)} aria-expanded={jumpOpen} disabled={!keyDates.length}>
              {t("cal.jump")} <ChevronDown size={15} />
            </button>
            <AnimatePresence>
              {jumpOpen && (
                <motion.ul className="jump-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                  {keyDates.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => {
                          goTo(e.date);
                          openDay(e.date);
                          setJumpOpen(false);
                        }}
                        style={{ ["--c" as string]: `var(--${eventTypeRegistry.get(e.type)?.color})` }}
                      >
                        <span className="jm-date">{fmtDate(e.date, locale, { day: "numeric", month: "short" })}</span>
                        <span className="jm-title">{e.title}</span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <div className="seg small" role="tablist">
            {(["month", "week"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}>
                {mode === m && <motion.span layoutId="cal-seg" className="seg-pill" transition={{ duration: motionTokens.base, ease: motionTokens.ease }} />}
                <span className="seg-label">{t(m === "month" ? "cal.month" : "cal.week")}</span>
              </button>
            ))}
          </div>
          <button
            className="ghost-btn sync"
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              void syncToGoogle(events).finally(() => setSyncing(false));
            }}
            title={t("cal.sync")}
          >
            <CalendarSync size={16} className={syncing ? "spin" : ""} />
            <span>{syncing ? t("cal.syncing") : "Google"}</span>
          </button>
        </div>
      </header>
      <Legend events={events} />
      <div className="cal-body">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={viewKey}
            className="cal-view"
            custom={dir}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -28 }}
            transition={{ duration: 0.32, ease: motionTokens.ease }}
          >
            {mode === "month" ? (
              <MonthGrid cursor={cursor} days={days} today={today} selected={selected} onSelect={openDay} />
            ) : (
              <WeekGrid start={startOfWeek(cursor)} days={days} today={today} selected={selected} onSelect={openDay} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Legend({ events }: { events: CalendarEvent[] }) {
  const t = useT();
  const present = new Set(events.map((e) => e.type));
  return (
    <div className="cal-legend">
      {eventTypeRegistry
        .list()
        .filter((d) => present.has(d.type))
        .sort((a, b) => a.order - b.order)
        .map((d) => (
          <span key={d.type} style={{ ["--c" as string]: `var(--${d.color})` }}>
            <i />
            {t(d.label)}
          </span>
        ))}
    </div>
  );
}
