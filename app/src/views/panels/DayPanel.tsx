import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, X } from "lucide-react";
import { useMemo } from "react";
import { eventTypeRegistry } from "@/calendar";
import { byDay, useCalendarEvents } from "@/calendar/useEvents";
import { useUi } from "@/state/ui";
import { intlLocale, useLocale, useT } from "@/i18n";
import { parseDate } from "../format";
import { SessionEditor } from "./SessionEditor";

/** Side panel for a day: every item links to its real entity; plan sessions from here. */
export function DayPanel() {
  const t = useT();
  const locale = useLocale();
  const day = useUi((s) => s.day);
  const editor = useUi((s) => s.sessionEditor);
  const openDay = useUi((s) => s.openDay);
  const newSession = useUi((s) => s.newSession);
  const close = useUi((s) => s.closeSessionEditor);
  const events = useCalendarEvents();
  const list = useMemo(() => (day ? byDay(events).get(day) ?? [] : []), [events, day]);
  const open = Boolean(day || editor);
  const date = day ? parseDate(day) : null;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => (openDay(null), close())} />
          <motion.aside
            className="side-panel"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            aria-label={day ?? "session"}
          >
            <button className="icon-btn sp-close" onClick={() => (openDay(null), close())} aria-label="close">
              <X size={18} />
            </button>
            {editor ? (
              <SessionEditor key={editor.id ?? editor.date} editor={editor} onDone={close} />
            ) : (
              date && (
                <>
                  <header className="dp-head">
                    <span className="dp-wd">{new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long" }).format(date)}</span>
                    <span className="dp-day">
                      <b>{date.getDate()}</b> {new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(date)}
                    </span>
                  </header>
                  <div className="dp-list">
                    {list.length ? (
                      list.map((e, i) => {
                        const def = eventTypeRegistry.get(e.type);
                        if (!def) return null;
                        const Item = def.DayItem;
                        return (
                          <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.3 }}>
                            <Item event={e} />
                          </motion.div>
                        );
                      })
                    ) : (
                      <p className="hand-note dp-empty">{t("day.empty")}</p>
                    )}
                  </div>
                  <button className="primary-btn dp-add" onClick={() => newSession(day!)}>
                    <CalendarPlus size={17} />
                    {t("day.addSession")}
                  </button>
                </>
              )
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
