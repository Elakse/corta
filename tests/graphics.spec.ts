/** Full-size graphics QA: all local evaluations join automatically; no course-specific math lives here. */
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { evaluationPages } from "./pages";
import { openNotebook, settle } from "./notebook";

for (const evaluation of evaluationPages()) {
  test(`graphics · ${evaluation.name}`, async ({ page }) => {
    test.setTimeout(600_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openNotebook(page, evaluation.url, { openAll: true });
    const directory = join(process.cwd(), ".transfer/graphics-review", evaluation.name);
    mkdirSync(directory, { recursive: true });
    const report: unknown[] = [];
    const profiles = [
      { width: 1440, theme: "light", modes: true },
      { width: 400, theme: "dark", modes: true },
      { width: 900, theme: "light", modes: false },
      { width: 400, theme: "light", modes: false },
    ];
    const requestedWidth = process.env.CORTA_GRAPHICS_WIDTH;
    const reportName = requestedWidth ? `report-${requestedWidth}.json` : "report.json";
    for (const { width, theme, modes } of profiles.filter(p => !requestedWidth || p.width === Number(requestedWidth))) {
      await page.setViewportSize({ width, height: 1600 });
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await settle(page);
      const graphics = page.locator(".canvas-host, .fig-diagram");
      for (let i = 0; i < await graphics.count(); i++) {
        const graphic = graphics.nth(i);
        const buttons = graphic.locator("button[aria-pressed]");
        const count = modes ? await buttons.count() : 0;
        for (let j = 0; j < Math.max(1, count); j++) {
          if (count) await buttons.nth(j).click();
          await page.mouse.move(0, 0);
          await graphic.scrollIntoViewIfNeeded({ timeout: 30_000 });
          await page.waitForTimeout(120);
          const result = await graphic.evaluate(root => {
            const texts = [...root.querySelectorAll("svg text, svg .svg-math-label")];
            const clipped = texts.filter(text => {
              const r = text.getBoundingClientRect(), s = text.closest("svg")!.getBoundingClientRect();
              return r.left < s.left - 1 || r.right > s.right + 1 || r.top < s.top - 1 || r.bottom > s.bottom + 1;
            }).map(text => text.textContent);
            const collisions: (string | null)[][] = [];
            if (root.classList.contains("canvas-host")) {
              texts.forEach((a, index) => texts.slice(index + 1).forEach(b => {
                if (a.closest("svg") !== b.closest("svg")) return;
                const r = a.getBoundingClientRect(), s = b.getBoundingClientRect();
                const x = Math.min(r.right, s.right) - Math.max(r.left, s.left);
                const y = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
                if (x > 4 && y > 3 && x * y > 25) collisions.push([a.textContent, b.textContent]);
              }));
            }
            const invalid = [...root.querySelectorAll("path[d]")].filter(p => /NaN|Infinity/.test(p.getAttribute("d")!)).length;
            const ancestorClipped: string[] = [];
            for (let parent = root.parentElement; parent; parent = parent.parentElement) {
              const css = getComputedStyle(parent);
              if (!["hidden", "clip"].includes(css.overflowX)) continue;
              const r = root.getBoundingClientRect(), p = parent.getBoundingClientRect();
              if (r.left < p.left - 1 || r.right > p.right + 1) ancestorClipped.push(parent.className);
            }
            return {
              label: root.querySelector("svg[aria-label]")?.getAttribute("aria-label"), clipped, collisions, invalid, ancestorClipped,
              mathErrors: [...root.querySelectorAll(".katex-error")].map(el => el.getAttribute("title") ?? el.textContent),
              overflow: root.classList.contains("canvas-host") ? [root.scrollWidth - root.clientWidth, root.scrollHeight - root.clientHeight] : [0, 0],
            };
          });
          report.push({ width, theme, i, j, ...result });
          writeFileSync(join(directory, reportName), JSON.stringify({ errors, report }, null, 2));
          await graphic.screenshot({ path: join(directory, `${width}-${theme}-${String(i).padStart(2, "0")}-${j}.png`), animations: "disabled", timeout: 30_000 });
        }
      }
    }
    const failed = (report as { clipped: unknown[]; collisions: unknown[]; invalid: number; ancestorClipped: unknown[]; overflow: number[]; mathErrors: unknown[] }[]).filter(r => r.clipped.length || r.collisions.length || r.invalid || r.ancestorClipped.length || r.mathErrors.length || r.overflow.some(v => v > 2));
    expect(errors).toEqual([]);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
  });
}
