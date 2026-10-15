import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { TopBar } from "./TopBar";
import { Toasts } from "./Toasts";
import { ContentWarnings } from "./ContentWarnings";
import { ChatPanel } from "@/llm/ChatPanel";
import { DayPanel } from "../panels/DayPanel";
import { useUi } from "@/state/ui";
import { useSettings } from "@/state/settings";
import { DEFAULT_CHAT_SHORTCUT, matchesShortcut, type ChatShortcut } from "@/state/shortcut";
import { SettingsDialog } from "./SettingsDialog";
import { CalibrationDialog } from "@/camera/CalibrationDialog";

export function Shell() {
  const loc = useLocation();
  const chatOpen = useUi((s) => s.chatOpen);
  useEffect(() => {
    if (!loc.pathname.includes("/e/")) window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      // A modal (settings, camera) owns the keyboard: Escape closes it, not the chat behind it.
      if (e.defaultPrevented || e.isComposing || e.repeat || ui.settingsOpen || document.querySelector("dialog[open]")) return;
      const saved = useSettings.getState().values["chat.shortcut"];
      const shortcut = (saved === undefined ? DEFAULT_CHAT_SHORTCUT : saved) as ChatShortcut | null;
      if (matchesShortcut(e, shortcut)) {
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
    <div className="app" data-chat-open={chatOpen || undefined}>
      <TopBar />
      <main className="app-main">
        <Outlet />
      </main>
      <ContentWarnings />
      <DayPanel />
      <ChatPanel />
      <SettingsDialog />
      <CalibrationDialog />
      <Toasts />
    </div>
  );
}
