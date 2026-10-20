import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useGraph } from "@/core/content";
import { useT } from "@/i18n";
import { renderChatMarkdown } from "./chip-registry";
import type { TutorReference } from "./chat-bridge";

/** The passage the next question is about, with a way to take it back. */
export function ReferenceBar({ reference, onRemove }: { reference: TutorReference | null; onRemove: () => void }) {
  const t = useT();
  const graph = useGraph();
  return (
    <AnimatePresence initial={false}>
      {reference && (
        <motion.div
          className="chat-ref"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <blockquote dangerouslySetInnerHTML={{ __html: renderChatMarkdown(reference.text, { graph, courseKey: null }) }} />
          <button type="button" className="icon-btn" onClick={onRemove} aria-label={t("chat.removeReference")} title={t("chat.removeReference")}><X size={14} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
