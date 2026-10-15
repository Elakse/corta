import { Lightbulb } from "lucide-react";
import { defineSelectionAction } from "../registry";

export default defineSelectionAction({
  id: "explain",
  order: 10,
  icon: Lightbulb,
  label: "selection.explain",
  ask: "selection.explainAsk",
  prompt: () =>
    "Explain the selected text concisely and in an easy-to-understand way, in the context of the node where I selected it. " +
    "Boil it down to the core idea; use a short analogy or a tiny example only if it really helps. Don't restate the whole node.",
});
