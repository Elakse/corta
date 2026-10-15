import { BookOpenCheck } from "lucide-react";
import { defineSelectionAction } from "../registry";

export default defineSelectionAction({
  id: "source",
  order: 20,
  icon: BookOpenCheck,
  label: "selection.source",
  ask: "selection.sourceAsk",
  prompt: () =>
    [
      "Trace the selected text back to the original course material it comes from.",
      "1. Start from the sources the node cites (in the context): read the cited page(s) with readSourcePage.",
      "2. If they don't contain it, or no page is cited, use searchSources with the key terms.",
      "3. Quote the original passage briefly (verbatim, a sentence or two) and cite every place with a source chip.",
      "4. Say how faithful the selected text is to it (same, reworded, inferred). If it was generated and you can't find it in the material, say so plainly and point to the closest passage.",
    ].join("\n"),
});
