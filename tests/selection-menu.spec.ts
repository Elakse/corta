import { expect, test, type Page } from "@playwright/test";
import { openNotebook } from "./notebook";

const EVAL = "/s/_sample/c/algebra/e/parcial-1";
const NODE = "alg/p1/autoval/def";

test.beforeEach(async ({ request }) => {
  await request.put("/api/llm/selection", { data: { provider: "mock", model: "mock" } });
});

/** Drags the mouse across the first paragraph of a node, like a reader with a highlighter. */
async function highlight(page: Page, nodeId: string, from = 0.02, to = 0.7) {
  const p = page.locator(`[data-node="${nodeId}"] p`).first();
  await p.scrollIntoViewIfNeeded();
  const box = (await p.boundingBox())!;
  await page.mouse.move(box.x + box.width * from, box.y + 14);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to, box.y + box.height - 10, { steps: 12 });
  await page.mouse.up();
}

test("dragging over notebook text draws a highlighter stroke, with no browser selection, and offers the tutor actions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNotebook(page, EVAL);
  await highlight(page, NODE);
  await expect(page.locator(".hl-band")).toHaveAttribute("d", /M/);
  expect(await page.evaluate(() => getSelection()?.isCollapsed ?? true)).toBe(true);
  const menu = page.getByRole("toolbar", { name: "Acciones sobre la selección" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button")).toHaveText(["Explicar", "Fuente", "Referenciar"]);
  await page.screenshot({ path: "test-results/selection-menu.png" });

  await menu.getByRole("button", { name: "Explicar" }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.locator(".hl-band")).toHaveCount(0);
  const user = page.locator(".m-user").last();
  await expect(user).toContainText("Explicame esto");
  await expect(user.locator(".m-quote")).toContainText("autovalor");
  await expect(page.locator(".chat-context .cc-node")).toContainText("Autovalor");
  await page.screenshot({ path: "test-results/selection-chat.png" });
});

test("Referenciar pins the selection above the chat input and sends it only with the reader's own question", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNotebook(page, EVAL);
  await highlight(page, NODE);
  await page.getByRole("toolbar", { name: "Acciones sobre la selección" }).getByRole("button", { name: "Referenciar" }).click();
  const ref = page.locator(".chat-input .chat-ref");
  await expect(ref).toContainText("autovalor");
  await expect(page.locator(".m-user")).toHaveCount(0); // nothing was sent
  const input = page.getByPlaceholder("¿Qué querés saber de esto?");
  await expect(input).toBeFocused();
  await expect(page.getByRole("button", { name: "Enviar" })).toBeDisabled();
  await page.screenshot({ path: "test-results/selection-reference.png" });

  await input.fill("¿Por qué esto es distinto de cero?");
  await input.press("Enter");
  await expect(ref).toHaveCount(0);
  const user = page.locator(".m-user").last();
  await expect(user).toContainText("¿Por qué esto es distinto de cero?");
  await expect(user.locator(".m-quote")).toContainText("autovalor");
});

test("the pinned reference can be taken back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNotebook(page, EVAL);
  await highlight(page, NODE);
  await page.getByRole("button", { name: "Referenciar" }).click();
  await page.getByRole("button", { name: "Quitar referencia" }).click();
  await expect(page.locator(".chat-ref")).toHaveCount(0);
  await expect(page.getByPlaceholder("¿Qué no entendés de esto?")).toBeVisible();
});

test("double click marks a word, formulas stay whole, Ctrl+C copies LaTeX and Esc clears", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNotebook(page, EVAL);
  const p = page.locator(`[data-node="${NODE}"] p`).first();
  await p.scrollIntoViewIfNeeded();
  const box = (await p.boundingBox())!;
  await page.mouse.dblclick(box.x + 6, box.y + 14);
  await expect(page.getByRole("toolbar")).toBeVisible();
  // a drag that starts inside a formula still takes the whole formula
  await highlight(page, NODE, 0.04, 0.35);
  await page.keyboard.press("Control+c");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/\$[^$]+\$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("toolbar")).toHaveCount(0);
});

test("interactive blocks are never selectable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openNotebook(page, EVAL);
  await expect(page.locator(".flow [data-interactive]").first()).toHaveCSS("user-select", "none");
  await expect(page.locator(".flow p").first()).toHaveCSS("user-select", "none");
});
