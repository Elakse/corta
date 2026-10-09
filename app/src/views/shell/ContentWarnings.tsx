import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, X } from "lucide-react";
import { useGraph } from "@/core/content";
import { useT } from "@/i18n";

/** A quiet corner indicator when content has problems; expands into the list. */
export function ContentWarnings() {
  const t = useT();
  const issues = useGraph().issues;
  const [open, setOpen] = useState(false);
  if (!issues.length) return null;
  const errors = issues.filter((i) => i.severity === "error").length;
  return (
    <div className="cw">
      <AnimatePresence>
        {open && (
          <motion.div className="cw-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <button className="cw-close icon-btn" onClick={() => setOpen(false)} aria-label="close">
              <X size={16} />
            </button>
            <ol className="issues">
              {issues.map((i, k) => (
                <li key={k} data-severity={i.severity}>
                  <div className="issue-where">
                    <span className="issue-file">{i.file}</span>
                    {i.path && <span className="issue-path">{i.path}</span>}
                  </div>
                  <div className="issue-msg">{i.message}</div>
                  {i.hint && <div className="issue-hint">→ {i.hint}</div>}
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
      <button className={`cw-btn${errors ? " has-errors" : ""}`} onClick={() => setOpen(!open)}>
        <AlertTriangle size={15} />
        {t("content.warnings", { n: issues.length })}
      </button>
    </div>
  );
}
