import { useParams } from "react-router";
import { useGraph, hasErrors } from "@/core/content";
import { VarsProvider } from "@/core/vars";
import { pageVars } from "@/core/content";
import { useT } from "@/i18n";
import { ContentErrorPanel } from "../shell/ContentErrorPanel";
import { NotFound } from "../shell/NotFound";
import { Notebook } from "./Notebook";
import "./notebook.css";

export default function EvaluationPage() {
  const { semester, course: courseId, evaluation: evalId } = useParams();
  const graph = useGraph();
  const t = useT();
  const course = graph.courses.get(`${semester}/${courseId}`);
  const ev = graph.evaluations.get(`${semester}/${courseId}/${evalId}`);
  if (!course || !ev) return <NotFound />;
  if (hasErrors(ev.issues)) return <ContentErrorPanel issues={ev.issues} />;
  if (!ev.content)
    return (
      <div className="page-pad">
        <p className="empty-note">{t("content.noContent")}</p>
      </div>
    );
  return (
    <VarsProvider scope={ev.key} initial={pageVars(ev.content.topics)}>
      <Notebook key={ev.key} course={course} evaluation={ev} />
    </VarsProvider>
  );
}
