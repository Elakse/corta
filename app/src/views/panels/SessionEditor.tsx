import { useMemo, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import type { StudySessionInput } from "@shared/api";
import { useGraph } from "@/core/content";
import { calendarCourses } from "@/calendar/derive";
import { useSessions } from "@/state/sessions";
import { toast } from "@/state/toast";
import { useUi } from "@/state/ui";
import { useT } from "@/i18n";
import { todayISO } from "../format";

/** Create / edit / delete a study session (date, start, duration, course, evaluation, topic, goal). */
export function SessionEditor({ editor, onDone }: { editor: { id?: string; date?: string }; onDone: () => void }) {
  const t = useT();
  const graph = useGraph();
  const sessions = useSessions((s) => s.items);
  const save = useSessions((s) => s.save);
  const remove = useSessions((s) => s.remove);
  const existing = editor.id ? sessions.find((s) => s.id === editor.id) : undefined;
  const courses = calendarCourses(graph);
  const [form, setForm] = useState<StudySessionInput>(
    () =>
      existing ?? {
        date: editor.date ?? todayISO(),
        start: "18:00",
        durationMin: 90,
        courseKey: courses[0]?.key ?? "",
        evaluationKey: null,
        topicId: null,
        goal: "",
      },
  );
  const course = graph.courses.get(form.courseKey);
  const evaluation = form.evaluationKey ? graph.evaluations.get(form.evaluationKey) : undefined;
  const topics = useMemo(() => evaluation?.content?.topics ?? [], [evaluation]);
  const set = <K extends keyof StudySessionInput>(k: K, v: StudySessionInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const s = await save({ ...form, goal: form.goal?.trim() || null }, existing?.id);
    if (s) {
      toast(t("session.saved"), "success");
      useUi.getState().openDay(s.date);
      onDone();
    }
  };

  return (
    <form className="session-form" onSubmit={submit}>
      <h3>{existing ? t("session.edit") : t("session.new")}</h3>
      <div className="row3">
        <label>
          <span>{t("session.date")}</span>
          <input type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} />
        </label>
        <label>
          <span>{t("session.start")}</span>
          <input type="time" required value={form.start} onChange={(e) => set("start", e.target.value)} />
        </label>
        <label>
          <span>{t("session.duration")}</span>
          <input type="number" min={15} step={15} max={720} required value={form.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} />
        </label>
      </div>
      <label>
        <span>{t("session.course")}</span>
        <select required value={form.courseKey} onChange={(e) => setForm((f) => ({ ...f, courseKey: e.target.value, evaluationKey: null, topicId: null }))}>
          {courses.map((c) => (
            <option key={c.key} value={c.key}>
              {c.data.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("session.evaluation")}</span>
        <select value={form.evaluationKey ?? ""} onChange={(e) => setForm((f) => ({ ...f, evaluationKey: e.target.value || null, topicId: null }))}>
          <option value="">{t("session.any")}</option>
          {course?.evaluations.map((ev) => (
            <option key={ev.key} value={ev.key}>
              {ev.meta.title}
            </option>
          ))}
        </select>
      </label>
      {topics.length > 0 && (
        <label>
          <span>{t("session.topic")}</span>
          <select value={form.topicId ?? ""} onChange={(e) => set("topicId", e.target.value || null)}>
            <option value="">{t("session.any")}</option>
            {topics.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {tp.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>{t("session.goal")}</span>
        <textarea rows={3} value={form.goal ?? ""} onChange={(e) => set("goal", e.target.value)} />
      </label>
      <div className="form-actions">
        {existing && (
          <button
            type="button"
            className="ghost-btn danger"
            onClick={async () => {
              await remove(existing.id);
              onDone();
            }}
          >
            <Trash2 size={15} />
            {t("session.delete")}
          </button>
        )}
        <span className="grow" />
        <button type="button" className="ghost-btn" onClick={onDone}>
          {t("session.cancel")}
        </button>
        <button type="submit" className="primary-btn">
          {t("session.save")}
        </button>
      </div>
    </form>
  );
}
