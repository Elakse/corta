import type { Context, Next } from "hono";
import type { ZodType } from "zod";

/** JSON body validation with readable 400s. Exposes the parsed value as c.req.valid("json"). */
export function validJson<T>(schema: ZodType<T>) {
  return async (c: Context<any, any, { in: { json: T }; out: { json: T } }>, next: Next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid JSON body" }, 400);
    }
    const r = schema.safeParse(body);
    if (!r.success) return c.json({ error: "invalid request", issues: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);
    c.req.addValidatedData("json", r.data as object);
    await next();
  };
}
