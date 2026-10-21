/**
 * The learned-node shape (docs/learned-shape-port.md): checking a node draws one closed tab+band outline
 * (fill under the frame, ink loop above it), unchecking removes it, and a reload shows it with no animation.
 * Animations only run on the user's own toggles and never with prefers-reduced-motion.
 */
import { expect, test, type Page } from "@playwright/test";
import { openNotebook } from "./notebook";

const EVAL = "/s/_sample/c/algebra/e/parcial-1";
const PARENT = "alg/p1/autoval/thm-li";
const CHILD = "alg/p1/autoval/thm-li/dem";
const check = (page: Page, id: string) => page.locator(`[data-node-check="${id}"]`);
const ink = (page: Page) => page.locator(".margin-layer .learned-ink");
const fill = (page: Page) => page.locator(".sheet .learned-fill");
/** running animations on the shape layers' elements */
const shapeAnimations = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest?.(".shape-layer")).length,
  );

test.beforeEach(async ({ request }) => {
  const { done } = (await (await request.get("/api/progress")).json()) as { done: string[] };
  if (done.length) await request.post("/api/progress", { data: { unset: done } });
});

test("check draws the outline, uncheck removes it, reload brings it back without animating", async ({ page }) => {
  await openNotebook(page, EVAL);
  await expect(ink(page)).toHaveCount(0);
  await expect(fill(page)).toHaveCount(0);

  await check(page, PARENT).click();
  // one outline for the outermost learned node only (its learned child gets none)
  await expect(ink(page)).toHaveCount(1);
  await expect(fill(page)).toHaveCount(1);
  expect(await shapeAnimations(page)).toBeGreaterThan(0); // the user's toggle animates
  const d = await ink(page).getAttribute("d");
  expect(d).toMatch(/^M[^M]+Z$/); // one closed path
  expect(await fill(page).getAttribute("d")).toBe(d); // same path for fill and ink
  await expect(ink(page)).toHaveAttribute("pathLength", "1");

  await page.waitForTimeout(500); // let the progress write reach the server before reloading
  await page.reload();
  await page.waitForSelector(".flow");
  await expect(ink(page)).toHaveCount(1);
  await expect(fill(page)).toHaveCount(1);
  expect(await shapeAnimations(page)).toBe(0); // no animation on load

  await check(page, PARENT).click(); // uncheck
  await expect(ink(page)).toHaveCount(0, { timeout: 5000 });
  await expect(fill(page)).toHaveCount(0);
});

test("checking a parent swaps its learned children's outlines for its own", async ({ page }) => {
  await openNotebook(page, EVAL);
  await check(page, CHILD).click();
  await expect(ink(page)).toHaveCount(1);
  const childShape = await ink(page).getAttribute("d");

  await check(page, PARENT).click();
  await expect(ink(page)).toHaveCount(1, { timeout: 5000 }); // the child's leaves, the parent's stays
  await expect.poll(() => ink(page).getAttribute("d")).not.toBe(childShape);
});

test("reduced motion: the shape shows with no animation at all", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openNotebook(page, EVAL);
  await check(page, PARENT).click();
  await expect(ink(page)).toHaveCount(1);
  expect(await shapeAnimations(page)).toBe(0);
  await check(page, PARENT).click();
  await expect(ink(page)).toHaveCount(0);
});

test("the shape follows the checkbox: the tab wraps it and the band reaches the frame", async ({ page }) => {
  await openNotebook(page, EVAL);
  await check(page, PARENT).click();
  await expect(ink(page)).toHaveCount(1);
  await page.waitForTimeout(1200);
  const geo = await page.evaluate((id) => {
    const box = document.querySelector(`[data-node-check="${id}"]`)!.getBoundingClientRect();
    const path = document.querySelector<SVGPathElement>(".margin-layer .learned-ink")!.getBoundingClientRect();
    const frame = document.querySelector(".frame")!.getBoundingClientRect();
    return { box: box.toJSON(), path: path.toJSON(), frame: frame.toJSON() };
  }, PARENT);
  expect(geo.path.left).toBeLessThan(geo.box.left); // tab edge is left of the checkbox
  expect(geo.path.top).toBeLessThanOrEqual(geo.box.top);
  expect(geo.path.bottom).toBeGreaterThanOrEqual(geo.box.bottom);
  expect(Math.abs(geo.path.right - (geo.frame.right - 0.7))).toBeLessThan(3); // reaches the right border's centre
});
