import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { colorTokens, dark, light } from "./tokens";
import { tokensToCss } from "./apply";

describe("theme tokens", () => {
  it("light and dark define every color token", () => {
    for (const k of colorTokens) {
      expect(light[k], k).toBeTruthy();
      expect(dark[k], k).toBeTruthy();
    }
  });
  it("tailwind maps every color token (single source, no drift)", () => {
    const css = readFileSync(fileURLToPath(new URL("./tailwind.css", import.meta.url)), "utf8");
    for (const k of colorTokens) expect(css, `--color-${k}`).toContain(`--color-${k}: var(--${k})`);
  });
  it("emits light, dark and forced-theme blocks", () => {
    const css = tokensToCss();
    expect(css).toContain(":root {");
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("--u: 30px");
  });
});
