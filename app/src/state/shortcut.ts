export interface ChatShortcut {
  key: string;
  primary: boolean;
  alt: boolean;
  shift: boolean;
}
export const DEFAULT_CHAT_SHORTCUT: ChatShortcut = { key: "j", primary: true, alt: false, shift: false };

type KeyEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;
export function captureShortcut(e: KeyEvent): ChatShortcut | null {
  if (e.key.length !== 1 || (!e.ctrlKey && !e.metaKey && !e.altKey)) return null;
  return { key: e.key.toLowerCase(), primary: e.ctrlKey || e.metaKey, alt: e.altKey, shift: e.shiftKey };
}
export function matchesShortcut(e: KeyEvent, shortcut: ChatShortcut | null): boolean {
  return Boolean(shortcut && e.key.toLowerCase() === shortcut.key &&
    (e.ctrlKey || e.metaKey) === shortcut.primary && e.altKey === shortcut.alt && e.shiftKey === shortcut.shift);
}
export function shortcutLabel(shortcut: ChatShortcut): string {
  return [shortcut.primary && "Ctrl/⌘", shortcut.alt && "Alt", shortcut.shift && "Shift", shortcut.key.toUpperCase()].filter(Boolean).join(" + ");
}
