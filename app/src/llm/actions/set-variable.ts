import { z } from "zod";
import { pageBridge } from "../page-bridge";
import { defineAction } from "../registry";

export default defineAction({
  name: "setVariable",
  description: "Change a shared page variable (e.g. a slider value) so the graphs and text that read it update. Only variables listed in the context exist.",
  input: z.object({ name: z.string(), value: z.union([z.number(), z.boolean(), z.string()]) }),
  run({ name, value }) {
    const store = pageBridge.vars;
    if (!store) return "no study page is open";
    if (!(name in store.getState().values)) return `variable "${name}" doesn't exist on this page`;
    store.getState().set(name, value);
    return `${name} = ${String(value)}`;
  },
});
