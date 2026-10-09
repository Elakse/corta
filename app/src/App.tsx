import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { useProgress } from "@/state/progress";
import { useSettings } from "@/state/settings";
import { useSessions } from "@/state/sessions";
import { Shell } from "./views/shell/Shell";
import { NotFound } from "./views/shell/NotFound";

const Home = lazy(() => import("./views/home/HomePage"));
const SemesterPage = lazy(() => import("./views/semester/SemesterPage"));
const CoursePage = lazy(() => import("./views/course/CoursePage"));
const EvaluationPage = lazy(() => import("./views/evaluation/EvaluationPage"));

export function App() {
  useEffect(() => {
    void useSettings.getState().load();
    void useProgress.getState().load();
    void useSessions.getState().load();
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Suspense fallback={null}><Home /></Suspense>} />
          <Route path="s/:semester" element={<Suspense fallback={null}><SemesterPage /></Suspense>} />
          <Route path="s/:semester/c/:course" element={<Suspense fallback={null}><CoursePage /></Suspense>} />
          <Route path="s/:semester/c/:course/e/:evaluation" element={<Suspense fallback={null}><EvaluationPage /></Suspense>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
