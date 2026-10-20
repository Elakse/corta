import { Quote } from "lucide-react";
import { referenceTutor } from "../../chat-bridge";
import { defineSelectionAction } from "../registry";

/** Sends nothing: pins the selection above the chat input so the reader writes their own question about it. */
export default defineSelectionAction({
  id: "reference",
  order: 30,
  icon: Quote,
  label: "selection.reference",
  run: (selection) => referenceTutor(selection),
});
