import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import { ArrowUp, Eraser, Sparkles, Square, X, Wand2 } from "lucide-react";
import { useStore } from "zustand";
import type { ChatContentBlock, ChatMessage } from "@shared/api";
import { api } from "@/api/client";
import { useGraph } from "@/core/content";
import { kindRegistry } from "@/core/registry";
import { createVarsStore } from "@/core/vars";
import { useProgress } from "@/state/progress";
import { useUi } from "@/state/ui";
import { useT } from "@/i18n";
import { todayISO } from "@/views/format";
import { buildContext, systemPrompt } from "./context";
import { usePageBridge } from "./page-bridge";
import { runAction, toolDefinitions } from "./registry";
import { useLlmConnection } from "./connection";
import { renderChatMarkdown } from "./chip-registry";
import { takeTutorRequest, useTutorRequests, type TutorRequest } from "./chat-bridge";
import { courseKeyOf, evaluationKeyOf } from "./route";
import { motionTokens } from "@/theme/tokens";
import { MathText } from "@/ui/MathText";
import { CaptureDialog } from "@/camera/CaptureDialog";
import { imagesFromClipboard, useAttachments, type Attachment } from "./attachments";
import { AttachButtons, AttachmentThumbs } from "./AttachmentBar";
import { TutorError } from "./errors";

interface DisplayItem {
  role: "user" | "assistant" | "action" | "error";
  text: string;
  /** selected passage the user asked about (user items) */
  quote?: string;
  /** images sent with the question (user items), as data URLs */
  images?: string[];
  /** course the answer belongs to, so its source chips keep resolving after navigating away */
  courseKey?: string | null;
}

const MAX_TOOL_ROUNDS = 5;
const FOLLOW_BOTTOM_DISTANCE = 48;
const emptyVars = createVarsStore();

/** Contextual chat side panel: knows what "this" is from the structured page snapshot, can act through actions. */
export function ChatPanel() {
  const t = useT();
  const reducedMotion = useReducedMotion();
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
  const { config, selecting, loading, error: connectionError, load } = useLlmConnection();
  const profile = config?.providers.find((p) => p.id === config.selection.provider);
  const ready = Boolean(profile?.configured) && !selecting && !loading && !connectionError;
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const attachments = useAttachments();
  const [shooting, setShooting] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const sessionId = useRef(crypto.randomUUID());
  const listRef = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!useLlmConnection.getState().config || useLlmConnection.getState().error) void load();
    const focusTimer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 250);
    return () => clearTimeout(focusTimer);
  }, [open, load]);
  useLayoutEffect(() => { if (open) followBottom.current = true; }, [open]);
  useLayoutEffect(() => {
    const list = listRef.current;
    // Streaming follows the reader's intent, without restarting a smooth scroll for every chunk.
    if (open && list && followBottom.current) list.scrollTo({ top: list.scrollHeight, behavior: "instant" });
  }, [items, busy, open]);

  const snapshot = useMemo(
    () => buildContext({ graph, path: loc.pathname, selected, visible, vars, done, today: todayISO() }),
    [graph, loc.pathname, selected, visible, vars, done],
  );
  useEffect(() => { sessionId.current = crypto.randomUUID(); }, [config?.selection.provider, config?.selection.model]);
  useEffect(() => () => abort.current?.abort(), []);
  function currentContext() {
    const bridge = usePageBridge.getState();
    bridge.refresh?.();
    const ui = useUi.getState();
    const path = window.location.pathname;
    const courseKey = courseKeyOf(path);
    const language = (courseKey && graph.courses.get(courseKey)?.data.language) || "es";
    const evaluationKey = evaluationKeyOf(path);
    const snapshot = buildContext({ graph, path, selected: ui.selected, visible: ui.visible,
      vars: bridge.evaluationKey === evaluationKey ? bridge.vars?.getState().values ?? {} : {},
      done: useProgress.getState().done, today: todayISO() });
    return systemPrompt(snapshot.text, language);
  }

  async function send(text: string, shown?: Pick<TutorRequest, "display" | "quote">, images: Attachment[] = []) {
    if ((!text.trim() && !images.length) || busy || useLlmConnection.getState().busy || !ready || !config) return;
    followBottom.current = true;
    if (!shown) setDraft("");
    const courseKey = courseKeyOf(window.location.pathname);
    setBusy(true);
    useLlmConnection.setState({ busy: true });
    const ctrl = new AbortController();
    abort.current = ctrl;
    // Photos only (no words) still make a question.
    const prompt = text.trim() ? text : t("chat.imageOnly");
    const content: string | ChatContentBlock[] = images.length
      ? [{ type: "text", text: prompt }, ...images.map((a) => ({ type: "image" as const, mediaType: a.mediaType, data: a.data }))]
      : prompt;
    let msgs: ChatMessage[] = [...history, { role: "user", content }];
    let completedHistory = history;
    setItems((x) => [...x, { role: "user", text: shown?.display ?? prompt, quote: shown?.quote, images: images.length ? images.map((a) => a.dataUrl) : undefined }, { role: "assistant", text: "", courseKey }]);
    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        ctrl.signal.throwIfAborted();
        const system = currentContext();
        let textOut = "";
        const tools: { id: string; name: string; input: unknown }[] = [];
        for await (const ev of api.llm.chat({ system, messages: msgs, tools: toolDefinitions(), sessionId: sessionId.current, ...config.selection }, ctrl.signal)) {
          if (ev.type === "text") {
            textOut += ev.text;
            setItems((x) => [...x.slice(0, -1), { role: "assistant", text: textOut, courseKey }]);
          } else if (ev.type === "tool_use") tools.push(ev);
          else if (ev.type === "error") throw new TutorError(ev.message, ev.code);
        }
        const assistant: ChatContentBlock[] = [...(textOut ? [{ type: "text" as const, text: textOut }] : []), ...tools.map((x) => ({ type: "tool_use" as const, ...x }))];
        msgs = [...msgs, { role: "assistant", content: assistant.length ? assistant : textOut }];
        if (!tools.length) { completedHistory = msgs; break; }
        ctrl.signal.throwIfAborted();
        const results: ChatContentBlock[] = [];
        for (const call of tools) {
          const r = await runAction(call.name, call.input, { graph, navigate });
          setItems((x) => {
            const pending = x.at(-1)?.role === "assistant" && !x.at(-1)!.text;
            return [...(pending ? x.slice(0, -1) : x), { role: "action", text: r.display }];
          });
          results.push({ type: "tool_result", tool_use_id: call.id, content: r.text, is_error: !r.ok });
        }
        msgs = [...msgs, { role: "user", content: results }];
        completedHistory = msgs;
        // Let page actions commit before reading variables, visibility and route for the next round.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        setItems((x) => (x.at(-1)?.role === "assistant" && !x.at(-1)!.text ? x : [...x, { role: "assistant", text: "", courseKey }]));
      }
      setHistory(msgs);
    } catch (e) {
      if (!ctrl.signal.aborted) {
        const reason = e instanceof TutorError && e.code === "images_unsupported"
          ? t("chat.imagesUnsupported")
          : t("chat.error", { msg: e instanceof Error ? e.message : String(e) });
        setItems((x) => [...x.filter((i) => i.text || i.role !== "assistant"), { role: "error", text: reason }]);
      }
      setHistory(completedHistory);
    } finally {
      setItems((x) => x.filter((i) => i.text || i.role !== "assistant"));
      setBusy(false);
      useLlmConnection.setState({ busy: false });
      abort.current = null;
    }
  }

  // Requests from elsewhere (e.g. the selection menu) wait for the connection and any streaming answer.
  const pending = useTutorRequests((s) => s.pending);
  useEffect(() => {
    if (!pending || !open || !ready || busy || !config) return;
    const request = takeTutorRequest();
    if (request) void send(request.prompt, request);
    // `send` is deliberately not a dependency: it is recreated every render and reads fresh state itself.
  }, [pending, open, ready, busy, config]);

  const canSend = ready && !busy && (Boolean(draft.trim()) || attachments.items.length > 0);
  function submit() {
    if (!canSend || useLlmConnection.getState().busy) return;
    const images = attachments.items;
    attachments.clear();
    void send(draft, undefined, images);
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = imagesFromClipboard(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    void attachments.addFiles(files);
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
          transition={{ duration: reducedMotion ? 0 : motionTokens.fast, ease: motionTokens.ease }}
        >
          <header className="chat-head">
            <div className="chat-title">
              <Sparkles size={17} />
              {t("chat.title")}
            </div>
            <div className="chat-actions">
              <button className="icon-btn" disabled={busy} onClick={() => { followBottom.current = true; setItems([]); setHistory([]); sessionId.current = crypto.randomUUID(); }} aria-label={t("chat.clear")} title={t("chat.clear")}>
                <Eraser size={16} />
              </button>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("settings.close")}>
                <X size={17} />
              </button>
            </div>
          </header>
          <div className="chat-context" title={focus?.id}>
            <span className="cc-label">{t("chat.context")}</span>
            <span className="cc-node">
              {glyph && <i>{glyph}</i>}
              {focus ? <MathText text={focus.title ?? focus.id} /> : t("chat.nothing")}
            </span>
          </div>
          <div className="chat-list" ref={listRef} onScroll={(e) => {
            const list = e.currentTarget;
            followBottom.current = list.scrollHeight - list.clientHeight - list.scrollTop <= FOLLOW_BOTTOM_DISTANCE;
          }}>
            {profile && !profile.configured && <div className="chat-setup">{t("chat.setup")}</div>}
            {connectionError && <div className="msg m-error" role="alert">{t("chat.connectionError")}</div>}
            {items.map((m, i) => (
              <motion.div key={i} className={`msg m-${m.role}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {m.role === "assistant" ? (
                  <div className="md" dangerouslySetInnerHTML={{ __html: renderChatMarkdown(m.text, { graph, courseKey: m.courseKey ?? null }) }} />
                ) : m.role === "action" ? (
                  <>
                    <Wand2 size={13} /> {m.text}
                  </>
                ) : (
                  <>
                    {m.images && (
                      <div className="m-images" style={{ "--n": m.images.length } as CSSProperties}>
                        {m.images.map((src, i) => <img key={i} src={src} alt={t("chat.imageAlt", { n: i + 1 })} />)}
                      </div>
                    )}
                    {m.quote && <blockquote className="m-quote" dangerouslySetInnerHTML={{ __html: renderChatMarkdown(m.quote, { graph, courseKey: null }) }} />}
                    {m.text}
                  </>
                )}
              </motion.div>
            ))}
            {busy && items.at(-1)?.role !== "assistant" && <div className="msg m-typing"><span /><span /><span /></div>}
          </div>
          <form className="chat-input" onSubmit={onSubmit}>
            {attachments.items.length > 0 && <AttachmentThumbs items={attachments.items} onRemove={attachments.remove} />}
            <AttachButtons disabled={!ready} full={attachments.full} onFiles={(files) => void attachments.addFiles(files)} onCamera={() => setShooting(true)} />
            <textarea ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onPaste={onPaste} placeholder={t("chat.placeholder")} rows={1} disabled={!ready} />
            {busy ? (
              <button type="button" className="send" onClick={() => abort.current?.abort()} aria-label={t("chat.stop")}>
                <Square size={14} />
              </button>
            ) : (
              <button type="submit" className="send" disabled={!canSend} aria-label={t("chat.send")}>
                <ArrowUp size={17} />
              </button>
            )}
          </form>
          {/* Outside the form: its buttons must not submit the question. */}
          <CaptureDialog open={shooting} onClose={() => setShooting(false)} onCapture={(photo) => attachments.add([photo])} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
