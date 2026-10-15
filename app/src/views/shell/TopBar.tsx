import { Link, useParams } from "react-router";
import { ChevronRight, Settings, Sparkles } from "lucide-react";
import { useGraph } from "@/core/content";
import { useUi } from "@/state/ui";
import { useT } from "@/i18n";
import { Logo } from "./Logo";

function Crumbs() {
  const { semester, course, evaluation } = useParams();
  const graph = useGraph();
  const sem = graph.semesters.find((s) => s.id === semester);
  const c = course ? graph.courses.get(`${semester}/${course}`) : undefined;
  const ev = evaluation ? graph.evaluations.get(`${semester}/${course}/${evaluation}`) : undefined;
  const items = [
    sem && { to: `/s/${sem.id}`, label: sem.data.label },
    c && { to: `/s/${semester}/c/${course}`, label: c.data.code ? `${c.data.name}` : c.data.name },
    ev && { to: `/s/${semester}/c/${course}/e/${evaluation}`, label: ev.meta.title },
  ].filter(Boolean) as { to: string; label: string }[];
  if (!items.length) return null;
  return (
    <nav className="crumbs" aria-label="breadcrumb">
      {items.map((it, i) => (
        <span key={it.to} className="crumb">
          <ChevronRight size={14} className="crumb-sep" aria-hidden />
          {i === items.length - 1 ? <span aria-current="page">{it.label}</span> : <Link to={it.to}>{it.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

export function TopBar() {
  const t = useT();
  const setChatOpen = useUi((s) => s.setChatOpen);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link to="/" className="brand" aria-label={t("nav.home")}>
          <Logo />
          <span>Corta</span>
        </Link>
        <Crumbs />
      </div>
      <div className="topbar-right">
        <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} title={t("settings.title")} aria-label={t("settings.title")}>
          <Settings size={18} />
        </button>
        <button type="button" className="ask-btn" onClick={() => setChatOpen(true)} aria-label={t("nav.chat")}>
          <Sparkles size={16} />
          <span>{t("nav.chat")}</span>
        </button>
      </div>
    </header>
  );
}
