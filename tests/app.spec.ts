/** App flows on the sample course (own servers + throwaway DB, see playwright.config.ts); Home uses the real active semester. */
import { expect, test, type Page } from "@playwright/test";
import { openNotebook } from "./notebook";

const EVAL = "/s/_sample/c/algebra/e/parcial-1";
const check = (page: Page, id: string) => page.locator(`[data-node-check="${id}"]`);

test.beforeEach(async ({ request }) => {
  // start every test from a clean slate (only the e2e DB)
  const { done } = (await (await request.get("/api/progress")).json()) as { done: string[] };
  if (done.length) await request.post("/api/progress", { data: { unset: done } });
});

test("nested checklist: parent sets subtree, child makes parent partial, persists across reloads", async ({ page }) => {
  await openNotebook(page, EVAL);
  await check(page, "alg/p1/autoval/thm-li").click();
  await expect(check(page, "alg/p1/autoval/thm-li")).toHaveAttribute("data-state", "on");
  await expect(check(page, "alg/p1/autoval/thm-li/dem")).toHaveAttribute("data-state", "on");
  await expect(check(page, "alg/p1/autoval")).toHaveAttribute("data-state", "partial");
  await expect(page.locator('[data-node="alg/p1/autoval/thm-li"]')).toHaveClass(/done/);

  await check(page, "alg/p1/autoval/thm-li/dem").click();
  await expect(check(page, "alg/p1/autoval/thm-li")).toHaveAttribute("data-state", "partial");

  await page.waitForTimeout(400);
  await page.reload();
  await page.waitForSelector(".flow");
  await expect(check(page, "alg/p1/autoval/thm-li")).toHaveAttribute("data-state", "partial");
  await expect(check(page, "alg/p1/autoval/thm-li/dem")).toHaveAttribute("data-state", "off");

  // a container is complete when all its children are
  await check(page, "alg/p1/autoval").click();
  await expect(check(page, "alg/p1/autoval")).toHaveAttribute("data-state", "on");
  await expect(page.getByTestId("eval-progress")).not.toHaveText("0 %");
});

test("exercise: 'Lo resolví bien' marks the exercise as learned", async ({ page }) => {
  await openNotebook(page, EVAL);
  const ex = page.locator('[data-node="alg/p1/autoval/ej-g3-4"]');
  await ex.locator(".sol-toggle").click();
  await ex.locator(".solved").click();
  await expect(check(page, "alg/p1/autoval/ej-g3-4")).toHaveAttribute("data-state", "on");
});

test("shared variables: a slider updates text that reads the variable", async ({ page }) => {
  await openNotebook(page, EVAL);
  const node = page.locator('[data-node="alg/p1/repr/chi"]');
  await expect(node).toContainText("Autovalores");
  const slider = node.locator('input[type="range"]');
  await slider.fill("2.5");
  await expect(node.locator(".rl-text").filter({ hasText: "Autovalores" })).toContainText("2.5");
});

test("overview: clicking a treemap cell scrolls to and selects the node", async ({ page }) => {
  await openNotebook(page, EVAL);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".tm-cell", { hasText: "Verificar con NumPy" }).click();
  await expect(page.locator('[data-node="alg/p1/autoval/numpy"]')).toHaveAttribute("data-selected", "true");
  await expect(page.locator('[data-node="alg/p1/autoval/numpy"]')).toBeInViewport();
});

test("paper type switch persists per evaluation", async ({ page }) => {
  await openNotebook(page, EVAL);
  await page.getByRole("button", { name: "Cuadriculada" }).click();
  await expect(page.locator(".sheet")).toHaveAttribute("data-paper", "grid");
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator(".sheet")).toHaveAttribute("data-paper", "grid");
  await page.getByRole("button", { name: "Rayada" }).click();
});

test("home: semester card, priority card, calendar with classes; plan and delete a study session", async ({ page }) => {
  await page.goto("/");
  // Home shows the real active semester, so this test only relies on what every semester has
  await expect(page.locator(".sem-card")).toBeVisible();
  await expect(page.locator(".prio-card")).toBeVisible();
  // open today's day
  await page.locator(".day[data-today], .wh[data-today]").first().click();
  const panel = page.locator(".side-panel");
  await expect(panel).toBeVisible();
  // plan a session that day
  await panel.getByRole("button", { name: "Planificar sesión" }).click();
  await panel.locator("textarea").fill("repasar autovalores");
  await panel.getByRole("button", { name: "Guardar" }).click();
  await expect(panel.locator(".day-item", { hasText: "repasar autovalores" })).toBeVisible();
  // edit → delete
  await panel.locator(".di-edit").click();
  await panel.getByRole("button", { name: "Borrar" }).click();
  await expect(page.locator(".day-item", { hasText: "repasar autovalores" })).toHaveCount(0);
});

test("course and semester pages render from content", async ({ page }) => {
  await page.goto("/s/_sample");
  await page.locator(".course-card").first().click();
  await expect(page).toHaveURL(/\/c\/algebra$/);
  await expect(page.locator(".ev-row")).toHaveCount(3);
  await page.getByRole("link", { name: /Estudiar/ }).click();
  await expect(page).toHaveURL(new RegExp(`${EVAL}$`));
});

test("LLM panel: context follows the selected node, streams an answer and runs actions", async ({ page }) => {
  await openNotebook(page, EVAL);
  await page.locator('[data-node="alg/p1/autoval/thm-li"] .kind .title').click();
  await page.keyboard.press("Control+j");
  await expect(page.locator(".chat-context")).toContainText("Independencia de autovectores");
  await page.locator(".chat-input textarea").fill("¿me abrís la demostración?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".m-assistant").first()).toContainText("Independencia de autovectores");
  await expect(page.locator(".m-action")).toContainText("openCollapsible");
  await expect(page.locator('[data-node="alg/p1/autoval/thm-li/dem"] .sol-toggle')).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".m-assistant").last()).toContainText("Listo");
});

test("LLM connection: switching remembers each model and survives reload", async ({ page }) => {
  await page.goto("/");
  const initial = await (await page.request.get("/api/llm/configuration")).json();
  try {
    await page.getByRole("button", { name: /Preguntar/ }).click();
    const provider = page.locator(".chat-connection select");
    const model = page.locator(".chat-connection input");
    await expect(provider).toBeVisible();
    await provider.selectOption("opencode-go");
    await expect(model).toBeEnabled();
    await model.fill("deepseek-v4-flash");
    await model.press("Enter");
    await expect.poll(async () => (await (await page.request.get("/api/llm/configuration")).json()).selection.model).toBe("deepseek-v4-flash");
    await provider.selectOption("anthropic");
    await expect(model).toHaveValue("claude-sonnet-5-5");
    await provider.selectOption("opencode-go");
    await expect(model).toHaveValue("deepseek-v4-flash");
    await page.reload();
    await page.getByRole("button", { name: /Preguntar/ }).click();
    await expect(provider).toHaveValue("opencode-go");
    await expect(model).toHaveValue("deepseek-v4-flash");
  } finally {
    await page.request.put("/api/settings/llm.configuration", { data: { value: { selection: initial.selection, models: initial.models } } });
  }
});

test("unknown routes show a friendly not-found", async ({ page }) => {
  await page.goto("/s/nope/c/nada");
  await expect(page.locator(".hand-note")).toBeVisible();
});
