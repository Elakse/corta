/** App flows on the sample course (own servers + throwaway DB, see playwright.config.ts); Home uses the real active semester. */
import { expect, test, type Page } from "@playwright/test";
import { openNotebook } from "./notebook";

const EVAL = "/s/_sample/c/algebra/e/parcial-1";
const check = (page: Page, id: string) => page.locator(`[data-node-check="${id}"]`);

test.beforeEach(async ({ request }) => {
  // start every test from a clean slate (only the e2e DB)
  const { done } = (await (await request.get("/api/progress")).json()) as { done: string[] };
  if (done.length) await request.post("/api/progress", { data: { unset: done } });
  await request.put("/api/settings/chat.shortcut", { data: { value: { key: "j", primary: true, alt: false, shift: false } } });
  await request.put("/api/settings/theme", { data: { value: "system" } });
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
  await expect(page.locator(".desk-page").getByRole("button", { name: "Cuadriculada" })).toHaveCount(0);
  await page.getByRole("button", { name: "Configuración", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cuadriculada", exact: true }).click();
  await expect(page.locator(".sheet")).toHaveAttribute("data-paper", "grid");
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator(".sheet")).toHaveAttribute("data-paper", "grid");
  await page.getByRole("button", { name: "Configuración", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Cuadriculada", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("dialog").getByRole("button", { name: "Rayada", exact: true }).click();
  await expect(page.locator(".sheet")).toHaveAttribute("data-paper", "ruled");
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
    await page.getByRole("button", { name: "Configuración" }).click();
    const provider = page.getByLabel("Proveedor del tutor");
    const model = page.getByLabel("Modelo del tutor");
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
    await page.getByRole("button", { name: "Configuración" }).click();
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


test("home card bodies navigate, while course links keep their own destination", async ({ page }) => {
  await page.goto("/");
  const semesterUrl = await page.locator(".sem-title").getAttribute("href");
  await page.locator(".sem-card").click({ position: { x: 12, y: 12 } });
  await expect(page).toHaveURL(new RegExp(`${semesterUrl}$`));
  await page.goto("/");
  const courseUrl = await page.locator(".sc-course").first().getAttribute("href");
  await page.locator(".sc-course").first().click();
  await expect(page).toHaveURL(new RegExp(`${courseUrl}$`));
  await page.goto("/");
  const priority = page.locator("a.prio-card");
  const priorityUrl = await priority.getAttribute("href");
  await expect(page.locator(".prio-go")).toHaveCount(0);
  await priority.locator(".prio-reason").click();
  await expect(page).toHaveURL(new RegExp(`${priorityUrl}$`));
});

test("settings: theme and configurable shortcut persist; disable works; modal traps focus", async ({ page }) => {
  const initial = await (await page.request.get("/api/settings")).json();
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Configuración" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Oscuro", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const recorder = page.locator("#chat-shortcut");
    await recorder.click();
    await page.locator("#chat-shortcut").press("Control+Shift+k");
    await expect(page.locator("#chat-shortcut")).toHaveText("Ctrl/⌘ + Shift + K");
    await page.keyboard.press("Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.keyboard.press("Control+j");
    await expect(page.locator(".chat")).toHaveCount(0);
    await page.keyboard.press("Control+Shift+k");
    await expect(page.locator(".chat")).toBeVisible();
    await expect(page.locator(".chat select, .chat input[list], .ask-btn kbd")).toHaveCount(0);
    await expect.poll(async () => (await (await page.request.get("/api/settings")).json())["chat.shortcut"]?.key).toBe("k");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.keyboard.press("Control+Shift+k");
    await expect(page.locator(".chat")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Configuración" }).click();
    await dialog.getByRole("button", { name: "Desactivar", exact: true }).click();
    await expect(page.locator("#chat-shortcut")).toHaveText("Sin atajo");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+Shift+k");
    await expect(page.locator(".chat")).toHaveCount(0);
  } finally {
    await page.request.put("/api/settings/theme", { data: { value: initial.theme ?? "system" } });
    await page.request.put("/api/settings/chat.shortcut", { data: { value: initial["chat.shortcut"] ?? { key: "j", primary: true, alt: false, shift: false } } });
  }
});

test("chat: notebook stays beside it, scroll updates focus and each request uses the fresh screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await openNotebook(page, EVAL);
  const old = page.locator('[data-node="alg/p1/autoval/def"]');
  await old.locator(".kind .title").click();
  const before = await page.locator(".sheet").boundingBox();
  await page.getByRole("button", { name: "Preguntar", exact: true }).click();
  await expect(page.locator(".chat-context")).toContainText("Autovalor y autovector");
  await expect.poll(async () => {
    const sheet = await page.locator(".sheet").boundingBox();
    const chat = await page.locator(".chat").boundingBox();
    return Boolean(sheet && chat && sheet.x + sheet.width <= chat.x && sheet.x < before!.x);
  }).toBe(true);
  await page.screenshot({ path: "test-results/chat-desktop.png" });
  const current = page.locator('[data-node="alg/p1/repr/chi"]');
  await current.scrollIntoViewIfNeeded();
  await expect(old).not.toBeInViewport();
  await expect(page.locator(".chat-context")).not.toContainText("Autovalor y autovector");
  // Force scrolling and submitting in the same task, before the scheduled scroll observer fires.
  await page.locator(".chat-input textarea").fill("explicame esto");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/llm/chat") && r.method() === "POST");
  await page.evaluate(() => {
    const node = document.querySelector('[data-node="alg/p1/autoval/pol-car"]')!;
    node.scrollIntoView({ block: "center", behavior: "instant" });
    (document.querySelector(".chat-input") as HTMLFormElement).requestSubmit();
  });
  const payload = (await request).postDataJSON();
  expect(payload.system).toContain("Polinomio característico");
  expect(payload.system).not.toMatch(/## "This"[^\n]*\n### [^\n]*Autovalor y autovector/);
  await expect(page.locator(".m-assistant").last()).toContainText("Polinomio característico");
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await page.locator(".sheet").boundingBox())!.width).toBe(before!.width);
});

test("chat on mobile leaves the notebook readable above the dock", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 850 });
  await openNotebook(page, EVAL);
  await page.getByRole("button", { name: "Preguntar", exact: true }).click();
  const chat = await page.locator(".chat").boundingBox();
  expect(chat!.y).toBeGreaterThan(400);
  expect(chat!.width).toBeLessThanOrEqual(400);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
  await page.screenshot({ path: "test-results/chat-mobile.png" });
});

test("LLM tool follow-up refreshes page variables and navigation before its next request", async ({ page }) => {
  const snapshots: string[] = [];
  await page.route("**/api/llm/chat", async (route) => {
    snapshots.push(route.request().postDataJSON().system);
    const events = snapshots.length === 1 ? [
      { type: "tool_use", id: "set-k", name: "setVariable", input: { name: "k", value: 2.5 } },
      { type: "tool_use", id: "navigate", name: "navigateTo", input: { nodeId: "alg/p1/repr/chi" } },
      { type: "done", stopReason: "tool_use" },
    ] : [{ type: "text", text: "Contexto actualizado." }, { type: "done", stopReason: "end_turn" }];
    await route.fulfill({ contentType: "text/event-stream", body: events.map((ev) => `data: ${JSON.stringify(ev)}\n\n`).join("") });
  });
  await openNotebook(page, EVAL);
  await page.getByRole("button", { name: "Preguntar", exact: true }).click();
  await page.locator(".chat-input textarea").fill("mostrame el polinomio con otro valor");
  await page.keyboard.press("Enter");
  await expect(page.locator(".m-assistant").last()).toContainText("Contexto actualizado");
  expect(snapshots).toHaveLength(2);
  expect(snapshots[0]).toContain("k = 1");
  expect(snapshots[1]).toContain("k = 2.5");
  expect(snapshots[1]).toMatch(/## "This"[^\n]*\n### [^\n]*El polinomio característico como función/);
  await expect(page.locator(".m-action").last()).toContainText("navigateTo: scrolled to");
});
