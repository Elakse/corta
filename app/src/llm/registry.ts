import { z } from "zod";
import type { ContentGraph } from "@/core/content";
import { createRegistry } from "@/core/registry";

export interface ActionContext {
  graph: ContentGraph;
  navigate: (path: string) => void;
}

/** Something the LLM can do in the UI, exposed to the model as a tool. Adding one = a file in actions/. */
export interface ActionDef<I = any> {
  name: string;
  description: string;
  input: z.ZodType<I>;
  /** returns a short result string for the model */
  run: (input: I, ctx: ActionContext) => string | Promise<string>;
}

export const actionRegistry = createRegistry<ActionDef>("llm actions", (a) => a.name);
export const defineAction = <I>(a: ActionDef<I>) => a;

/** Tool definitions for the provider (JSON Schema from each action's Zod input). */
export function toolDefinitions() {
  return actionRegistry.list().map((a) => {
    const schema = z.toJSONSchema(a.input, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
    delete schema.$schema;
    return { name: a.name, description: a.description, input_schema: schema };
  });
}

export async function runAction(name: string, input: unknown, ctx: ActionContext): Promise<{ ok: boolean; text: string }> {
  const a = actionRegistry.get(name);
  if (!a) return { ok: false, text: `unknown action ${name}` };
  const parsed = a.input.safeParse(input);
  if (!parsed.success) return { ok: false, text: `invalid input: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
  try {
    return { ok: true, text: await a.run(parsed.data, ctx) };
  } catch (e) {
    return { ok: false, text: e instanceof Error ? e.message : String(e) };
  }
}
