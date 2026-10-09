import { createContext, useContext } from "react";
import type { Course, Evaluation } from "@/core/content";

/** What every node on an evaluation page needs to know about the page. */
export interface PageContextValue {
  course: Course;
  evaluation: Evaluation;
  evaluationDir: string;
  language: string;
  /** NodeView registers its element so the margin layer and scrolling can find it. */
  registerNode: (id: string, el: HTMLElement | null) => () => void;
  nodeElement: (id: string) => HTMLElement | undefined;
}

export const PageContext = createContext<PageContextValue | null>(null);
export function usePage(): PageContextValue {
  const v = useContext(PageContext);
  if (!v) throw new Error("usePage outside an evaluation page");
  return v;
}
