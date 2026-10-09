import type { ChatRequest, ChatStreamEvent } from "../../../../shared/api";
import type { LlmProvider } from "../provider";

/**
 * Deterministic offline provider for tests and demos (CORTA_LLM_PROVIDER=mock). It answers with the
 * focused node from the context and, when asked to "abrir"/"open", calls the openCollapsible tool.
 */
export const mockProvider: LlmProvider = {
  id: "mock",
  label: "Offline demo",
  models: ["mock"],
  model: () => "mock",
  configured: () => true,
  async *stream(req: ChatRequest): AsyncIterable<ChatStreamEvent> {
    const last = req.messages.at(-1);
    const focus = /## "This"[^\n]*\n### ([^\n]+)\(id: ([^,]+),/.exec(req.system);
    if (last && Array.isArray(last.content) && last.content.some((b) => b.type === "tool_result")) {
      yield { type: "text", text: "Listo, ya lo abrí." };
      yield { type: "done", stopReason: "end_turn" };
      return;
    }
    const text = typeof last?.content === "string" ? last.content : "";
    const answer = focus ? `Estás mirando **${focus[1]!.trim()}**. $\\lambda$ es autovalor si $Av = \\lambda v$.` : "No hay nada seleccionado.";
    for (const w of answer.split(/(?<= )/)) yield { type: "text", text: w };
    if (focus && /abr|open/i.test(text) && req.tools.some((t) => t.name === "openCollapsible"))
      yield { type: "tool_use", id: "tool_1", name: "openCollapsible", input: { nodeId: focus[2]!.trim() } };
    yield { type: "done", stopReason: "end_turn" };
  },
};
