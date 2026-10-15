/** Typed client for the Corta API (shared/api.ts is the contract). */
import type {
  ChatRequest, ChatStreamEvent, GcalStatus, LlmConfiguration, LlmSelection, LlmStatus, ProgressChange, ProgressState, SourceHit, SourcePage, StudySession, StudySessionInput, SyncRequest, SyncResult,
} from "@shared/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      msg = body.error ?? msg;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

const coursePath = (courseKey: string) => courseKey.split("/").map(encodeURIComponent).join("/");

export const api = {
  health: () => call<{ ok: boolean }>("/health"),
  progress: {
    get: () => call<ProgressState>("/progress"),
    change: (c: ProgressChange) => call<{ ok: true }>("/progress", { method: "POST", json: c }),
  },
  settings: {
    all: () => call<Record<string, unknown>>("/settings"),
    set: (key: string, value: unknown) => call<{ ok: true }>(`/settings/${encodeURIComponent(key)}`, { method: "PUT", json: { value } }),
  },
  sessions: {
    list: () => call<{ sessions: StudySession[] }>("/sessions"),
    create: (s: StudySessionInput) => call<StudySession>("/sessions", { method: "POST", json: s }),
    update: (id: string, s: StudySessionInput) => call<StudySession>(`/sessions/${id}`, { method: "PUT", json: s }),
    remove: (id: string) => call<{ ok: true }>(`/sessions/${id}`, { method: "DELETE" }),
  },
  gcal: {
    status: () => call<GcalStatus>("/gcal/status"),
    sync: (r: SyncRequest) => call<SyncResult>("/gcal/sync", { method: "POST", json: r }),
    disconnect: () => call<{ ok: true }>("/gcal/disconnect", { method: "POST" }),
    authUrl: "/api/gcal/auth",
  },
  /** A course's original material; `courseKey` is "<semester>/<course>". */
  sources: {
    search: (courseKey: string, q: string, refs: string[] = []) =>
      call<{ hits: SourceHit[]; searched: number }>(`/sources/${coursePath(courseKey)}/search?${new URLSearchParams({ q, ...(refs.length ? { refs: refs.join(",") } : {}) })}`),
    page: (courseKey: string, ref: string, page: number) => call<SourcePage>(`/sources/${coursePath(courseKey)}/${encodeURIComponent(ref)}/pages/${page}`),
    /** Opens in the browser's viewer; PDFs jump to `page`. */
    fileUrl: (courseKey: string, ref: string, page?: number) => `/api/sources/${coursePath(courseKey)}/${encodeURIComponent(ref)}/file${page ? `#page=${page}` : ""}`,
  },
  llm: {
    configuration: () => call<LlmConfiguration>("/llm/configuration"),
    select: (selection: LlmSelection) => call<LlmConfiguration>("/llm/selection", { method: "PUT", json: selection }),
    status: () => call<LlmStatus>("/llm/status"),
    /** Streams one assistant turn (SSE). */
    async *chat(req: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
      const res = await fetch("/api/llm/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req), signal });
      if (!res.ok || !res.body) {
        let msg = res.statusText;
        try {
          msg = ((await res.json()) as { error?: string }).error ?? msg;
        } catch {
          /* ignore */
        }
        throw new ApiError(res.status, msg);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const data = chunk.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
          if (data) yield JSON.parse(data) as ChatStreamEvent;
        }
      }
    },
  },
};
