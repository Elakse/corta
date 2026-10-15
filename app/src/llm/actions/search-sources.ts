import { z } from "zod";
import { api } from "@/api/client";
import { translate } from "@/i18n";
import { defineAction } from "../registry";
import { courseKeyOf } from "../route";

export default defineAction({
  name: "searchSources",
  description:
    "Full-text search over the current course's original material (extracted text of classes, guides, past exams, books). " +
    "Returns the best matching pages with an excerpt. Use key terms (names, definitions, notation words), not whole sentences.",
  input: z.object({
    query: z.string().min(2).describe("key terms to look for"),
    refs: z.array(z.string()).optional().describe("limit to these source refs (from the context); omit to search everything"),
  }),
  display: ({ query }) => translate("chat.searchedSources", { q: query }),
  async run({ query, refs }) {
    const course = courseKeyOf(location.pathname);
    if (!course) return "Not inside a course: open a course or study page first.";
    const { hits, searched } = await api.sources.search(course, query, refs);
    if (!hits.length) return `No matches in ${searched} extracted source(s). Try other key terms.`;
    return hits.map((h) => `[[source:${h.ref}|${h.page}]] ${h.title}, p.${h.page}\n${h.excerpt}`).join("\n\n");
  },
});
