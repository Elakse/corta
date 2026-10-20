/** The notebook remembers where you were: survives a reload and leaving for another screen (own servers + throwaway DB). */
import { expect, test, type Page } from "@playwright/test";
import { openNotebook } from "./notebook";

const EVAL = "/s/_sample/c/algebra/e/parcial-1";
const KEY = "reading:_sample/algebra/parcial-1";
const NODE = "alg/p1/repr/forma";

const topOf = (page: Page, id: string) => page.locator(`[data-node="${id}"]`).evaluate((el) => el.getBoundingClientRect().top);
const saved = async (page: Page) => ((await (await page.request.get("/api/settings")).json()) as Record<string, unknown>)[KEY] ?? null;
const sameSpot = (page: Page, before: number) => expect.poll(async () => Math.abs((await topOf(page, NODE)) - before), { timeout: 10_000 }).toBeLessThan(3);

test.beforeEach(async ({ request }) => {
  await request.put(`/api/settings/${encodeURIComponent(KEY)}`, { data: { value: null } });
});

test("reading position survives a reload and a trip to another screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNotebook(page, EVAL);
  await page.evaluate((id) => window.scrollBy(0, document.querySelector(`[data-node="${id}"]`)!.getBoundingClientRect().top - 220), NODE);
  await expect.poll(() => saved(page), { timeout: 5000 }).not.toBeNull();
  const before = await topOf(page, NODE);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

  await page.reload();
  await page.waitForSelector(".flow");
  await sameSpot(page, before);

  await page.locator(".brand").click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await page.waitForSelector(".flow");
  await sameSpot(page, before);
});

test("scrolling back to the top is remembered too, and a stale overview click does not hijack the return", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNotebook(page, EVAL);
  // an overview click leaves a scroll request behind...
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".tm-cell", { hasText: "Verificar con NumPy" }).click();
  await expect(page.locator('[data-node="alg/p1/autoval/numpy"]')).toBeInViewport();
  // ...then the reader moves on elsewhere
  await page.evaluate((id) => window.scrollBy(0, document.querySelector(`[data-node="${id}"]`)!.getBoundingClientRect().top - 220), NODE);
  await expect.poll(async () => ((await saved(page)) as { id: string } | null)?.id).toBeTruthy();
  const before = await topOf(page, NODE);

  await page.locator(".brand").click();
  await page.goBack();
  await page.waitForSelector(".flow");
  await sameSpot(page, before);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => saved(page), { timeout: 5000 }).toBeNull();
  await page.reload();
  await page.waitForSelector(".flow");
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
});
