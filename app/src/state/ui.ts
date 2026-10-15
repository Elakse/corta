/** Transient UI state shared across views (not persisted). */
import { create } from "zustand";

interface UiStore {
  /** open collapsibles by `${nodeId}#${blockPath}`; nodes in `openNodes` open all of theirs */
  open: Record<string, boolean>;
  openNodes: ReadonlySet<string>;
  setOpen: (key: string, open: boolean) => void;
  openAllIn: (nodeId: string) => void;
  /** node the user clicked (what "this" means for the LLM) */
  selected: string | null;
  select: (id: string | null) => void;
  /** nodes currently in the reading viewport, ranked by visibility and reading position */
  visible: Record<string, number>;
  setVisible: (id: string, ratio: number) => void;
  /** request to scroll the evaluation page to a node (consumed by the page) */
  scrollTarget: { id: string; seq: number } | null;
  scrollTo: (id: string) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  /** camera calibration dialog (opened from Settings and from the photo dialog) */
  cameraSetupOpen: boolean;
  setCameraSetupOpen: (open: boolean) => void;
  /** day open in the day panel (YYYY-MM-DD) */
  day: string | null;
  openDay: (date: string | null) => void;
  /** study-session editor: an existing session id, or a new one for a date */
  sessionEditor: { id?: string; date?: string } | null;
  editSession: (id: string) => void;
  newSession: (date: string) => void;
  closeSessionEditor: () => void;
}

let seq = 0;
export const useUi = create<UiStore>((set) => ({
  open: {},
  openNodes: new Set(),
  setOpen: (key, open) => set((s) => ({ open: { ...s.open, [key]: open } })),
  openAllIn: (nodeId) => set((s) => ({ openNodes: new Set([...s.openNodes, nodeId]) })),
  selected: null,
  select: (selected) => set({ selected }),
  visible: {},
  setVisible: (id, ratio) =>
    set((s) => {
      if ((s.visible[id] ?? 0) === ratio) return s;
      const visible = { ...s.visible };
      if (ratio > 0) visible[id] = ratio;
      else delete visible[id];
      return { visible };
    }),
  scrollTarget: null,
  scrollTo: (id) => set({ scrollTarget: { id, seq: ++seq } }),
  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  cameraSetupOpen: false,
  setCameraSetupOpen: (cameraSetupOpen) => set({ cameraSetupOpen }),
  day: null,
  openDay: (day) => set({ day }),
  sessionEditor: null,
  editSession: (id) => set({ sessionEditor: { id } }),
  newSession: (date) => set({ sessionEditor: { date } }),
  closeSessionEditor: () => set({ sessionEditor: null }),
}));

export const collapsibleKey = (nodeId: string, path: string) => `${nodeId}#${path}`;

export function useCollapsible(nodeId: string, path: string, initial = false): [boolean, (v: boolean) => void] {
  const key = collapsibleKey(nodeId, path);
  const open = useUi((s) => s.open[key] ?? (s.openNodes.has(nodeId) || initial));
  const setOpen = useUi((s) => s.setOpen);
  return [open, (v) => setOpen(key, v)];
}
