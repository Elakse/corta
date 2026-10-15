import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Camera, Monitor, Moon, Sun, X } from "lucide-react";
import { useMatch } from "react-router";
import { useGraph, type Evaluation, type PaperType } from "@/core/content";
import { PaperSwitch } from "../evaluation/PaperSwitch";
import { useUi } from "@/state/ui";
import { useSetting } from "@/state/settings";
import { captureShortcut, DEFAULT_CHAT_SHORTCUT, shortcutLabel, type ChatShortcut } from "@/state/shortcut";
import { useLlmConnection } from "@/llm/connection";
import { useT } from "@/i18n";
import type { ThemeMode } from "@/theme";
import { DEFAULT_MARKER, markerColors, markerVar, type MarkerColor } from "@/core/highlighter";

const themes = [{ id: "light", Icon: Sun }, { id: "dark", Icon: Moon }, { id: "system", Icon: Monitor }] as const;

function NotebookPaperSetting({ evaluation }: { evaluation: Evaluation }) {
  const [paper, setPaper] = useSetting<PaperType>(`paper:${evaluation.key}`, evaluation.content!.paper);
  return <PaperSwitch value={paper} onChange={setPaper} />;
}

export function SettingsDialog() {
  const t = useT();
  const match = useMatch("/s/:semester/c/:course/e/:evaluation");
  const graph = useGraph();
  const params = match?.params;
  const evaluation = params ? graph.evaluations.get(`${params.semester}/${params.course}/${params.evaluation}`) : undefined;
  const open = useUi((s) => s.settingsOpen);
  const setOpen = useUi((s) => s.setSettingsOpen);
  const dialog = useRef<HTMLDialogElement>(null);
  const [theme, setTheme] = useSetting<ThemeMode>("theme", "system");
  const [marker, setMarker] = useSetting<MarkerColor>("highlighter.color", DEFAULT_MARKER);
  const [shortcut, setShortcut] = useSetting<ChatShortcut | null>("chat.shortcut", DEFAULT_CHAT_SHORTCUT);
  const [recording, setRecording] = useState(false);
  const { config, loading, selecting, busy, error, load, select } = useLlmConnection();
  const [modelDraft, setModelDraft] = useState("");
  const profile = config?.providers.find((p) => p.id === config.selection.provider);
  useEffect(() => { setModelDraft(config?.selection.model ?? ""); }, [config]);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      if (!useLlmConnection.getState().config || useLlmConnection.getState().error) void load();
    } else { dialog.current?.close(); setRecording(false); }
  }, [open, load]);
  function saveModel() {
    if (!config) return;
    const model = modelDraft.trim();
    if (model && model !== config.selection.model) void select({ ...config.selection, model });
    else setModelDraft(config.selection.model);
  }
  return (
    <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      onClick={(e) => { if (e.target === e.currentTarget) {
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) setOpen(false);
      } }}>
      <header className="settings-head">
        <h2 id="settings-title">{t("settings.title")}</h2>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("settings.close")}><X size={19} /></button>
      </header>
      <div className="settings-body">
        <fieldset className="theme-choices">
          <legend>{t("nav.theme")}</legend>
          {themes.map(({ id, Icon }) => <button key={id} type="button" aria-pressed={theme === id} onClick={() => setTheme(id)}><Icon size={20} />{t(`theme.${id}`)}</button>)}
        </fieldset>
        {evaluation?.content && <NotebookPaperSetting key={evaluation.key} evaluation={evaluation} />}
        <fieldset className="marker-choices">
          <legend>{t("settings.marker")}</legend>
          {markerColors.map((c) => (
            <button key={c} type="button" aria-pressed={marker === c} aria-label={t(`marker.${c}`)} title={t(`marker.${c}`)}
              style={{ "--swatch": markerVar(c) } as CSSProperties} onClick={() => setMarker(c)} />
          ))}
        </fieldset>
        <div className="settings-field">
          <label htmlFor="chat-shortcut">{t("settings.shortcut")}</label>
          <div className="shortcut-control">
            <button id="chat-shortcut" type="button" className="shortcut-record" aria-pressed={recording} onClick={() => setRecording(!recording)}
              onBlur={() => setRecording(false)} onKeyDown={(e) => {
                if (!recording || e.key === "Tab" || e.key === "Escape") return;
                e.preventDefault(); e.stopPropagation();
                const next = captureShortcut(e);
                if (next) { setShortcut(next); setRecording(false); }
              }}>
              {recording ? t("settings.record") : shortcut ? shortcutLabel(shortcut) : t("settings.disabled")}
            </button>
            <button className="ghost-btn" onClick={() => setShortcut(null)}>{t("settings.disable")}</button>
            <button className="ghost-btn" onClick={() => setShortcut(DEFAULT_CHAT_SHORTCUT)}>{t("settings.reset")}</button>
          </div>
        </div>
        <button type="button" className="settings-action" onClick={() => useUi.getState().setCameraSetupOpen(true)}>
          <Camera size={17} />{t("settings.cameraSetup")}
        </button>
        <div className="settings-field">
          <label htmlFor="tutor-provider">{t("chat.provider")}</label>
          <select id="tutor-provider" value={config?.selection.provider ?? ""} disabled={!config || loading || busy || selecting}
            onChange={(e) => {
              const p = config!.providers.find((p) => p.id === e.target.value)!;
              void select({ provider: p.id, model: config!.models[p.id] ?? p.defaultModel });
            }}>
            {config?.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="tutor-model">{t("chat.model")}</label>
          <input id="tutor-model" list="tutor-models" value={modelDraft} disabled={!config || loading || busy || selecting || profile?.id === "mock"}
            onChange={(e) => setModelDraft(e.target.value)} onBlur={saveModel}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }} />
          <datalist id="tutor-models">{[...new Set([profile?.defaultModel ?? "", ...(profile?.models ?? [])])].filter(Boolean).map((m) => <option key={m} value={m} />)}</datalist>
        </div>
        {error && <div className="settings-error" role="alert">{t("chat.connectionError")} <button className="ghost-btn" onClick={() => void load()}>{t("settings.retry")}</button></div>}
      </div>
    </dialog>
  );
}
