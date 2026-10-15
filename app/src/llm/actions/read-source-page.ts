import { z } from "zod";
import { api } from "@/api/client";
import { translate } from "@/i18n";
import { defineAction } from "../registry";
import { courseKeyOf } from "../route";

const MAX = 6000;

export default defineAction({
  name: "readSourcePage",
  description: "Read one page of a course source (its extracted text) by ref and page number, e.g. to verify what a node cites.",
  input: z.object({
    ref: z.string().describe("source ref from the context or from searchSources"),
    page: z.number().int().min(1),
  }),
  display: ({ ref, page }) => translate("chat.readSource", { ref, page }),
  async run({ ref, page }) {
    const course = courseKeyOf(location.pathname);
    if (!course) return "Not inside a course: open a course or study page first.";
    const p = await api.sources.page(course, ref, page);
    const text = p.text.length > MAX ? `${p.text.slice(0, MAX)}…` : p.text;
    return `[[source:${p.ref}|${p.page}]] ${p.title}, page ${p.page} of ${p.pages}\n\n${text || "(no text on this page: it may be an image)"}`;
  },
});
