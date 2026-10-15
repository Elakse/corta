/**
 * Design tokens: the single source of truth for colors, fonts, sizes and motion.
 * CSS reads them as custom properties (injected by `applyTheme`), Tailwind maps them in `tailwind.css`,
 * and graphics read them through `readToken` / `useTokens`. Never hardcode a color anywhere else.
 */

export const colorTokens = [
  // paper & desk (ported from prototypes/notebook-page)
  "desk", "paper", "rule", "frame", "ink", "ink-soft", "pen", "red", "card", "tape", "hole", "shadow",
  "hl", "learned", "learned-ink",
  // app chrome
  "surface", "surface-2", "line", "glow",
  // inset surfaces and scrollbar handles
  "code", "thumb", "thumb-hover",
  // camera preview: a dark stage in both themes, and the ink drawn on top of it
  "stage", "stage-ink",
  // highlighter inks (the reader picks one; see core/highlighter)
  "marker-yellow", "marker-green", "marker-pink", "marker-blue", "marker-orange",
  // calendar event types
  "ev-class", "ev-midterm", "ev-retake", "ev-final", "ev-submission", "ev-session", "ev-holiday",
] as const;
export type ColorToken = (typeof colorTokens)[number];
export type Palette = Record<ColorToken, string>;

export const light: Palette = {
  desk: "#e7e3ec",
  paper: "#fbfbf8",
  rule: "#d3d9e2",
  frame: "#8e97a5",
  ink: "#1c2230",
  "ink-soft": "#5d6578",
  pen: "#2447c4",
  red: "#c2412f",
  card: "#ffffff",
  tape: "rgba(236, 222, 164, .62)",
  hole: "#ddd8e2",
  shadow: "rgba(46, 34, 70, .16)",
  hl: "rgba(255, 226, 92, .55)",
  learned: "rgba(88, 196, 122, .15)",
  "learned-ink": "#2f9e5a",
  surface: "#f6f4f8",
  "surface-2": "#efecf3",
  line: "rgba(28, 34, 48, .10)",
  glow: "rgba(36, 71, 196, .14)",
  code: "#f1eff5",
  thumb: "rgba(28, 34, 48, .26)",
  "thumb-hover": "rgba(28, 34, 48, .5)",
  stage: "#14161c",
  "stage-ink": "#f4f5f8",
  "marker-yellow": "#ffe14d",
  "marker-green": "#9be58a",
  "marker-pink": "#ffa3c8",
  "marker-blue": "#8fd3ff",
  "marker-orange": "#ffbe6b",
  "ev-class": "#5b6b8f",
  "ev-midterm": "#d9480f",
  "ev-retake": "#c27c0e",
  "ev-final": "#b0234a",
  "ev-submission": "#7048e8",
  "ev-session": "#2f9e5a",
  "ev-holiday": "#8d93a0",
};

export const dark: Palette = {
  desk: "#0f1013",
  paper: "#1b1d22",
  rule: "#363c48",
  frame: "#535b68",
  ink: "#e4e7ee",
  "ink-soft": "#9ba2b0",
  pen: "#8ea6ff",
  red: "#ff8f78",
  card: "#23262c",
  tape: "rgba(210, 196, 140, .22)",
  hole: "#0f1013",
  shadow: "rgba(0, 0, 0, .55)",
  hl: "rgba(255, 214, 64, .22)",
  learned: "rgba(86, 201, 127, .11)",
  "learned-ink": "#5fcf87",
  surface: "#16181d",
  "surface-2": "#1e2128",
  line: "rgba(228, 231, 238, .09)",
  glow: "rgba(142, 166, 255, .16)",
  code: "#14161a",
  thumb: "rgba(228, 231, 238, .26)",
  "thumb-hover": "rgba(228, 231, 238, .5)",
  stage: "#0b0c10",
  "stage-ink": "#f4f5f8",
  "marker-yellow": "#9a8312",
  "marker-green": "#2c6e33",
  "marker-pink": "#84305a",
  "marker-blue": "#1b5f86",
  "marker-orange": "#8a4f10",
  "ev-class": "#8fa0c8",
  "ev-midterm": "#ff8a4c",
  "ev-retake": "#f0b44c",
  "ev-final": "#ff6b8e",
  "ev-submission": "#a991ff",
  "ev-session": "#5fcf87",
  "ev-holiday": "#7d8390",
};

/** How marker ink meets the paper: multiplied on light paper, screened (a glow) on dark paper. */
export const markerInk = {
  light: { blend: "multiply", edge: 0.55 },
  dark: { blend: "screen", edge: 0.8 },
} as const;

export const fonts = {
  body: '"Literata Variable", "Literata", Georgia, "Times New Roman", serif',
  display: '"Bricolage Grotesque Variable", "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif',
  hand: '"Caveat Variable", "Caveat", "Segoe Print", "Comic Sans MS", cursive',
  mono: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Consolas, monospace',
} as const;
export type FontToken = keyof typeof fonts;

/** Notebook metrics. `u` is one ruled line (= one grid cell). Phone values apply under `phoneMaxWidth`. */
export const metrics = {
  notebookWidth: 1040,
  deskGutter: 16,
  chatGap: 12,
  chatInset: 12,
  // Give spare desk space to chat before narrowing the notebook; 100% excludes the scrollbar.
  chatWidth: "clamp(320px, min(32vw, calc(100% - var(--notebook-width) - var(--desk-gutter) - var(--chat-gap) - var(--chat-inset))), 460px)",
  chatDockHeight: "min(44dvh, 400px)",
  u: 30,
  margin: 128,
  checkbox: 19,
  sink: 2, // px the text baseline sits above a rule's ink
  pencilNote: { width: 140, fontSize: 19 },
  phone: { maxWidth: 720, u: 28, margin: 76, checkbox: 15 },
  /** checkbox x positions (px from the sheet's left edge) per nesting depth */
  checkColumns: [62, 84, 106],
  checkColumnsPhone: [33, 49, 65],
} as const;

export const motionTokens = {
  ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
  easeCss: "cubic-bezier(.2, .8, .2, 1)",
  fast: 0.2,
  base: 0.4,
  slow: 0.7,
} as const;

export const radii = { sm: 4, md: 10, lg: 14, xl: 22 } as const;
