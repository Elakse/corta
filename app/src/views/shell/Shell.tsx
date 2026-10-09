import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { Toasts } from "./Toasts";
import { ContentWarnings } from "./ContentWarnings";
import { ChatPanel } from "@/llm/ChatPanel";
import { DayPanel } from "../panels/DayPanel";
import { useUi } from "@/state/ui";

export function Shell() {
  const loc = useLocation();
  useEffect(() => {
    if (!loc.pathname.includes("/e/")) window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        const ui = useUi.getState();
        ui.setChatOpen(!ui.chatOpen);
      }
      if (e.key === "Escape") {
        const ui = useUi.getState();
        if (ui.sessionEditor) ui.closeSessionEditor();
        else if (ui.day) ui.openDay(null);
        else ui.setChatOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="app">
      <TopBar />
      <main className="app-main">
        <Outlet />
      </main>
      <ContentWarnings />
      <DayPanel />
      <ChatPanel />
      <Toasts />
    </div>
  );
}
