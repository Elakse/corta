import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openNotebook, settle } from "./notebook";

for (const width of [1440, 400]) test(`math labels across reading and graphics surfaces · ${width}px`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openNotebook(page, "/s/_sample/c/algebra/e/parcial-1", { openAll: true });
  await page.getByRole("tab", { name: "Diagrama", exact: true }).click();
  await settle(page);
  const sample = page.locator('[data-node="alg/p1/repr/math-labels"]');
  await sample.scrollIntoViewIfNeeded();
  await expect(sample.locator(".gv-node .katex").first()).toBeVisible();
  await expect(sample.locator(".gv-edge .katex").first()).toBeVisible();
  await expect(sample.locator(".mermaid-host .katex").first()).toBeVisible();
  await expect(sample.locator(".canvas-host .katex").first()).toBeVisible();
  await expect(sample.locator(".title .katex")).toBeVisible();
  await expect(page.locator(".ctl-slider .katex").first()).toHaveCount(1);
  await expect(page.locator(".ctl-toggle .katex")).toHaveCount(1);
  await expect(page.locator(".ctl-input .katex")).toHaveCount(1);
  await expect(page.locator('[data-node="alg/p1/repr/chi"] .blk-graph .katex').first()).toHaveCount(1);
  await page.locator('[data-node="alg/p1/repr/forma"]').scrollIntoViewIfNeeded();
  await expect(page.locator(".graph3d .katex").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const clipped = await page.locator(".gv .svg-math-label").evaluateAll(labels => labels.flatMap(label => {
    const rect = label.getBoundingClientRect();
    const holder = label.closest(".gv-node")?.querySelector(".shape") ?? label.closest(".chip")?.querySelector("rect");
    const bounds = holder?.getBoundingClientRect();
    return bounds && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) ? [label.textContent] : [];
  }));
  expect(clipped).toEqual([]);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  expect(errors).toEqual([]);
  mkdirSync(".transfer/math-audit", { recursive: true });
  await sample.screenshot({ path: `.transfer/math-audit/fixture-${width}.png`, animations: "disabled" });
});
