import { motion } from "motion/react";
import { useGraph } from "@/core/content";
import { currentSemester } from "@/domain/courses";
import { useT } from "@/i18n";
import { Calendar } from "../calendar/Calendar";
import { SemesterCard } from "./SemesterCard";
import { PriorityCard } from "./PriorityCard";

/** Home: current semester + next priority (top third), the big calendar (bottom two thirds). */
export default function HomePage() {
  const t = useT();
  const graph = useGraph();
  const sem = currentSemester(graph);
  const rise = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.06 * i, ease: [0.2, 0.8, 0.2, 1] as const } });
  return (
    <div className="home">
      <div className="home-top">
        <motion.div {...rise(0)} className="home-cell">
          {sem ? <SemesterCard semester={sem} /> : <div className="card-surface empty">{t("home.noSemester")}</div>}
        </motion.div>
        <motion.div {...rise(1)} className="home-cell">
          <PriorityCard />
        </motion.div>
      </div>
      <motion.div {...rise(2)} className="home-cal">
        <Calendar />
      </motion.div>
    </div>
  );
}
