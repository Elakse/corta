import type { ContentIssue } from "@/core/content";
import { useT } from "@/i18n";

/** Invalid content never renders half-broken: this panel lists every problem with file, path and a hint. */
export function ContentErrorPanel({ issues }: { issues: ContentIssue[] }) {
  const t = useT();
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return (
    <div className="page-pad">
      <section className="error-panel" role="alert">
        <h1>{t("content.errorTitle")}</h1>
        <p className="error-lead">{t("content.errorHint")}</p>
        <ol className="issues">
          {[...errors, ...warnings].map((i, k) => (
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
      </section>
    </div>
  );
}
