import type { Page } from "@playwright/test";

/** Loads an evaluation page with every lazy topic mounted, fonts ready and the ruler settled. */
export async function openNotebook(page: Page, url: string, opts: { openAll?: boolean } = {}) {
  await page.goto(url);
  await page.waitForSelector(".flow");
  await page.evaluate(() => document.fonts.ready);
  // mount lazy topics by scrolling to the bottom until no placeholder is left
  for (let i = 0; i < 40; i++) {
    // in the page: a placeholder can mount (and vanish) between a count and a locator action
    const left = await page.evaluate(() => {
      const ph = document.querySelector("[data-placeholder]");
      ph?.scrollIntoView({ block: "center" });
      return !!ph;
    });
    if (!left) break;
    await page.waitForTimeout(150);
  }
  if (opts.openAll) {
    // one batch per nesting level (solutions inside solutions): clicking each through the locator API
    // costs a scroll + actionability wait per toggle, which a long course page can't afford
    for (let round = 0; round < 4; round++) {
      const n = await page.evaluate(() => {
        const closed = [...document.querySelectorAll<HTMLElement>('.sol-toggle[aria-expanded="false"]')];
        closed.forEach((el) => el.click());
        return closed.length;
      });
      if (!n) break;
      await page.waitForTimeout(800);
    }
  }
  await settle(page);
}

/** Waits until the layout stops changing (ruler passes, lazy blocks, animations). */
export async function settle(page: Page) {
  await page.waitForTimeout(800);
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const h = await page.evaluate(() => document.querySelector(".flow")!.getBoundingClientRect().height);
    if (Math.abs(h - last) < 0.5) break;
    last = h;
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(400);
}
