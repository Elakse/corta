import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import { ArrowUp, Eraser, Sparkles, Square, X, Wand2 } from "lucide-react";
import { useStore } from "zustand";
import type { ChatContentBlock, ChatMessage, LlmConfiguration, LlmSelection } from "@shared/api";
import { api } from "@/api/client";
import { useGraph } from "@/core/content";
import { kindRegistry } from "@/core/registry";
import { renderMarkdown } from "@/core/markup";
import { createVarsStore } from "@/core/vars";
import { useProgress } from "@/state/progress";
import { useUi } from "@/state/ui";
import { translate, useT } from "@/i18n";
import { todayISO } from "@/views/format";
import { buildContext, systemPrompt } from "./context";
import { usePageBridge } from "./page-bridge";
import { runAction, toolDefinitions } from "./registry";

interface DisplayItem {
  role: "user" | "assistant" | "action" | "error";
  text: string;
}

const MAX_TOOL_ROUNDS = 5;
const emptyVars = createVarsStore();

/** Contextual chat side panel: knows what "this" is from the structured page snapshot, can act through actions. */
export function ChatPanel() {
  const t = useT();
  const open = useUi((s) => s.chatOpen);
  const setOpen = useUi((s) => s.setChatOpen);
  const graph = useGraph();
  const loc = useLocation();
  const navigate = useNavigate();
  const selected = useUi((s) => s.selected);
  const visible = useUi((s) => s.visible);
  const done = useProgress((s) => s.done);
  const pageVars = usePageBridge((s) => s.vars);
  const vars = useStore(pageVars ?? emptyVars, (s) => s.values);
  const [config, setConfig] = useState<LlmConfiguration | null>(null);
  const [modelDraft, setModelDraft] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const profile = config?.providers.find((p) => p.id === config.selection.provider);
  const ready = Boolean(profile?.configured) && !selecting && !connectionError && modelDraft.trim() === config?.selection.model;
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const sessionId = useRef(crypto.randomUUID());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setConnectionError("");
    api.llm.configuration().then((c) => {
      if (!cancelled) { setConfig(c); setModelDraft(c.selection.model); }
    }).catch(() => { if (!cancelled) setConnectionError(translate("chat.connectionError")); });
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => { cancelled = true; clearTimeout(focusTimer); };
  }, [open]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const snapshot = useMemo(
    () => buildContext({ graph, path: loc.pathname, selected, visible, vars, done, today: todayISO() }),
    [graph, loc.pathname, selected, visible, vars, done],
  );
  const language = useMemo(() => {
    const m = /^\/s\/([^/]+)\/c\/([^/]+)/.exec(loc.pathname);
    return (m && graph.courses.get(`${m[1]}/${m[2]}`)?.data.language) || "es";
  }, [graph, loc.pathname]);

  async function send(text: string) {
    if (!text.trim() || busy || !ready || !config) return;
    setDraft("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    let msgs: ChatMessage[] = [...history, { role: "user", content: text }];
    let completedHistory = history;
    setItems((x) => [...x, { role: "user", text }, { role: "assistant", text: "" }]);
    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const system = systemPrompt(snapshot.text, language);
        let textOut = "";
        const tools: { id: string; name: string; input: unknown }[] = [];
        for await (const ev of api.llm.chat({ system, messages: msgs, tools: toolDefinitions(), sessionId: sessionId.current, ...config.selection }, ctrl.signal)) {
          if (ev.type === "text") {
            textOut += ev.text;
            setItems((x) => [...x.slice(0, -1), { role: "assistant", text: textOut }]);
          } else if (ev.type === "tool_use") tools.push(ev);
          else if (ev.type === "error") throw new Error(ev.message);
        }
        const assistant: ChatContentBlock[] = [...(textOut ? [{ type: "text" as const, text: textOut }] : []), ...tools.map((x) => ({ type: "tool_use" as const, ...x }))];
        msgs = [...msgs, { role: "assistant", content: assistant.length ? assistant : textOut }];
        if (!tools.length) { completedHistory = msgs; break; }
        ctrl.signal.throwIfAborted();
        const results: ChatContentBlock[] = [];
        for (const call of tools) {
          const r = await runAction(call.name, call.input, { graph, navigate });
          setItems((x) => [...x.slice(0, -1), { role: "action", text: `${call.name}: ${r.text}` }, ...(x.at(-1)?.text ? [x.at(-1)!] : [])]);
          results.push({ type: "tool_result", tool_use_id: call.id, content: r.text, is_error: !r.ok });
        }
        msgs = [...msgs, { role: "user", content: results }];
        completedHistory = msgs;
        setItems((x) => (x.at(-1)?.role === "assistant" && !x.at(-1)!.text ? x : [...x, { role: "assistant", text: "" }]));
      }
      setHistory(msgs);
    } catch (e) {
      if (!ctrl.signal.aborted) setItems((x) => [...x.filter((i) => i.text || i.role !== "assistant"), { role: "error", text: t("chat.error", { msg: e instanceof Error ? e.message : String(e) }) }]);
      setHistory(completedHistory);
    } finally {
      setItems((x) => x.filter((i) => i.text || i.role !== "assistant"));
      setBusy(false);
      abort.current = null;
    }
  }

  async function selectConnection(selection: LlmSelection) {
    if (busy || selecting || !config) return;
    setSelecting(true);
    setConnectionError("");
    try {
      const next = await api.llm.select(selection);
      setConfig(next);
      setModelDraft(next.selection.model);
      // Switching explicitly keeps the conversation; fresh provider session identity.
      sessionId.current = crypto.randomUUID();
    } catch {
      setConnectionError(t("chat.connectionError"));
      setModelDraft(config.selection.model);
    } finally { setSelecting(false); }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };
  const focus = snapshot.focus;
  const glyph = focus ? kindRegistry.get(focus.kind)?.glyph : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="chat"
          aria-label={t("chat.title")}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <header className="chat-head">
            <div className="chat-title">
              <Sparkles size={17} />
              {t("chat.title")}
            </div>
            <div className="chat-actions">
              <button className="icon-btn" disabled={busy} onClick={() => { setItems([]); setHistory([]); sessionId.current = crypto.randomUUID(); }} aria-label={t("chat.clear")} title={t("chat.clear")}>
                <Eraser size={16} />
              </button>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="close">
                <X size={17} />
              </button>
            </div>
          </header>
          {config && <div className="chat-connection">
            <select aria-label={t("chat.provider")} value={config.selection.provider} disabled={busy || selecting}
              onChange={(e) => {
                const p = config.providers.find((p) => p.id === e.target.value)!;
                void selectConnection({ provider: p.id, model: config.models[p.id] ?? p.defaultModel });
              }}>
              {config.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <input aria-label={t("chat.model")} list="tutor-models" value={modelDraft} disabled={busy || selecting || profile?.id === "mock"}
              onChange={(e) => setModelDraft(e.target.value)}
              onBlur={() => { if (modelDraft.trim() && modelDraft.trim() !== config.selection.model) void selectConnection({ ...config.selection, model: modelDraft.trim() }); else setModelDraft(config.selection.model); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }} />
            <datalist id="tutor-models">{[...new Set([profile?.defaultModel ?? "", ...(profile?.models ?? [])])].filter(Boolean).map((m) => <option key={m} value={m} />)}</datalist>
          </div>}
          <div className="chat-context" title={focus?.id}>
            <span className="cc-label">{t("chat.context")}</span>
            <span className="cc-node">
              {glyph && <i>{glyph}</i>}
              {focus ? focus.title ?? focus.id : t("chat.nothing")}
            </span>
          </div>
          <div className="chat-list" ref={listRef}>
            {profile && !profile.configured && <div className="chat-setup">{t("chat.setup")}</div>}
            {connectionError && <div className="msg m-error" role="alert">{connectionError}</div>}
            {items.map((m, i) => (
              <motion.div key={i} className={`msg m-${m.role}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {m.role === "assistant" ? (
                  <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                ) : m.role === "action" ? (
                  <>
                    <Wand2 size={13} /> {m.text}
                  </>
                ) : (
                  m.text
                )}
              </motion.div>
            ))}
            {busy && items.at(-1)?.role !== "assistant" && <div className="msg m-typing"><span /><span /><span /></div>}
          </div>
          <form className="chat-input" onSubmit={onSubmit}>
            <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder={t("chat.placeholder")} rows={2} disabled={!ready} />
            {busy ? (
              <button type="button" className="send" onClick={() => abort.current?.abort()} aria-label={t("chat.stop")}>
                <Square size={14} />
              </button>
            ) : (
              <button type="submit" className="send" disabled={!draft.trim() || !ready} aria-label={t("chat.send")}>
                <ArrowUp size={17} />
              </button>
            )}
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
