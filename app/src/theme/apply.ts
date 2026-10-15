import { colorTokens, dark, fonts, light, markerInk, metrics, motionTokens, radii, type Palette } from "./tokens";

const block = (p: Palette) => colorTokens.map((k) => `--${k}: ${p[k]};`).join(" ");

/** Builds the CSS custom-property sheet from tokens (light, dark via media query, and forced data-theme). */
export function tokensToCss(): string {
  const base = [
    block(light),
    ...Object.entries(fonts).map(([k, v]) => `--f-${k}: ${v};`),
    `--u: ${metrics.u}px; --margin: ${metrics.margin}px; --cb: ${metrics.checkbox}px; --sink: ${metrics.sink}px;`,
    `--pencil-note-width: ${metrics.pencilNote.width}px; --pencil-note-font-size: ${metrics.pencilNote.fontSize}px;`,
    `--ease: ${motionTokens.easeCss};`,
    `--chat-width: ${metrics.chatWidth}; --chat-dock-height: ${metrics.chatDockHeight};`,
    `--notebook-width: ${metrics.notebookWidth}px; --desk-gutter: ${metrics.deskGutter}px; --chat-gap: ${metrics.chatGap}px; --chat-inset: ${metrics.chatInset}px;`,
    ...Object.entries(radii).map(([k, v]) => `--r-${k}: ${v}px;`),
    `--marker-blend: ${markerInk.light.blend}; --marker-edge: ${markerInk.light.edge}; --marker: var(--marker-yellow);`,
    "color-scheme: light;",
  ].join(" ");
  const d = `${block(dark)} --marker-blend: ${markerInk.dark.blend}; --marker-edge: ${markerInk.dark.edge}; color-scheme: dark;`;
  const ph = metrics.phone;
  return [
    `:root { ${base} }`,
    `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${d} } }`,
    `:root[data-theme="dark"] { ${d} }`,
    `@media (max-width: ${ph.maxWidth}px) { :root { --u: ${ph.u}px; --margin: ${ph.margin}px; --cb: ${ph.checkbox}px; } }`,
  ].join("\n");
}

/** Injects the token sheet once (idempotent). Call before the first render. */
export function applyTheme(doc: Document = document): void {
  let el = doc.getElementById("corta-tokens");
  if (!el) {
    el = doc.createElement("style");
    el.id = "corta-tokens";
    doc.head.prepend(el);
  }
  el.textContent = tokensToCss();
}

export type ThemeMode = "system" | "light" | "dark";

export function setThemeMode(mode: ThemeMode, doc: Document = document): void {
  if (mode === "system") doc.documentElement.removeAttribute("data-theme");
  else doc.documentElement.setAttribute("data-theme", mode);
}
