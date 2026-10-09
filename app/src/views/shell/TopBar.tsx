import { Link, useParams } from "react-router";
import { ChevronRight, Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useGraph } from "@/core/content";
import { useSetting } from "@/state/settings";
import { useUi } from "@/state/ui";
import { useT } from "@/i18n";
import type { ThemeMode } from "@/theme";
import { Logo } from "./Logo";

const NEXT: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" };

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
  const [theme, setTheme] = useSetting<ThemeMode>("theme", "system");
  const setChatOpen = useUi((s) => s.setChatOpen);
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
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
        <button type="button" className="icon-btn" onClick={() => setTheme(NEXT[theme])} title={`${t("nav.theme")}: ${t(`theme.${theme}`)}`} aria-label={t("nav.theme")}>
          <ThemeIcon size={18} />
        </button>
        <button type="button" className="ask-btn" onClick={() => setChatOpen(true)} title="Ctrl/⌘ + J">
          <Sparkles size={16} />
          <span>{t("nav.chat")}</span>
          <kbd>⌘J</kbd>
        </button>
      </div>
    </header>
  );
}
