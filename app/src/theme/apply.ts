import { colorTokens, dark, fonts, light, metrics, motionTokens, radii, type Palette } from "./tokens";

const block = (p: Palette) => colorTokens.map((k) => `--${k}: ${p[k]};`).join(" ");

/** Builds the CSS custom-property sheet from tokens (light, dark via media query, and forced data-theme). */
export function tokensToCss(): string {
  const base = [
    block(light),
    ...Object.entries(fonts).map(([k, v]) => `--f-${k}: ${v};`),
    `--u: ${metrics.u}px; --margin: ${metrics.margin}px; --cb: ${metrics.checkbox}px; --sink: ${metrics.sink}px;`,
    `--ease: ${motionTokens.easeCss};`,
    ...Object.entries(radii).map(([k, v]) => `--r-${k}: ${v}px;`),
    "color-scheme: light;",
  ].join(" ");
  const d = `${block(dark)} color-scheme: dark;`;
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
