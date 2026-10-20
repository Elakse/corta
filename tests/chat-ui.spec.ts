import { expect, test, type Page } from "@playwright/test";
import { openNotebook } from "./notebook";

const EVAL = "/s/_sample/c/algebra/e/parcial-1";
type StreamWindow = typeof window & { chatStream: { append(text: string): void; finish(): void } };

test.beforeEach(async ({ request }) => {
  await request.put("/api/settings/theme", { data: { value: "system" } });
  await request.put("/api/settings/chat.shortcut", { data: { value: { key: "j", primary: true, alt: false, shift: false } } });
  await request.put("/api/llm/selection", { data: { provider: "mock", model: "mock" } });
});

/** A controllable SSE response exercises the real client parser while the answer is still streaming. */
async function installStream(page: Page) {
  await page.evaluate(() => {
    const nativeFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (!url.endsWith("/api/llm/chat")) return nativeFetch(input, init);
      return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          const event = (value: unknown) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`));
          (window as StreamWindow).chatStream = {
            append: (text) => event({ type: "text", text }),
            finish: () => { event({ type: "done", stopReason: "end_turn" }); controller.close(); },
          };
        },
      }), { headers: { "content-type": "text/event-stream" } });
    };
  });
}

async function append(page: Page, text: string) {
  await page.evaluate((chunk) => (window as StreamWindow).chatStream.append(chunk), text);
  await expect(page.locator(".m-assistant").last()).toContainText(text.trim().split("\n").at(-1)!);
}

const scrollPosition = (page: Page) => page.locator(".chat-list").evaluate((list) => ({
  top: list.scrollTop,
  gap: list.scrollHeight - list.clientHeight - list.scrollTop,
}));

for (const width of [1440, 400]) {
  test(`streaming chat preserves reading position and resumes following at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    await page.getByRole("button", { name: "Preguntar", exact: true }).click();
    await expect(page.locator(".chat-input textarea")).toBeEnabled();
    await installStream(page);
    await page.locator(".chat-input textarea").fill("Una respuesta larga");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Detener" })).toBeVisible();
    await append(page, Array.from({ length: 30 }, (_, i) => `Párrafo ${i + 1}: una línea que se puede leer mientras llega el resto.`).join("\n\n"));
    await expect.poll(async () => (await scrollPosition(page)).gap).toBeLessThanOrEqual(1);

    const list = page.locator(".chat-list");
    await list.hover();
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await scrollPosition(page)).gap).toBeGreaterThan(200);
    // Let the reading gesture settle before recording the position to preserve.
    await page.waitForTimeout(150);
    const reading = await scrollPosition(page);
    await append(page, "\n\nLlegó otro fragmento.\n\nY otro más, mientras seguís leyendo arriba.");
    await page.waitForTimeout(250);
    expect((await scrollPosition(page)).top).toBeCloseTo(reading.top, 0);
    await expect(page.getByRole("button", { name: "Detener" })).toBeVisible();

    await list.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect.poll(async () => (await scrollPosition(page)).gap).toBeLessThanOrEqual(1);
    await append(page, "\n\nVolviste al final: este fragmento vuelve a seguirse.");
    await expect.poll(async () => (await scrollPosition(page)).gap).toBeLessThanOrEqual(1);

    await list.hover();
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await scrollPosition(page)).gap).toBeGreaterThan(200);
    await page.waitForTimeout(150);
    const beforeFinish = await scrollPosition(page);
    await append(page, "\n\nÚltimo fragmento de la respuesta.");
    await page.evaluate(() => (window as StreamWindow).chatStream.finish());
    await expect(page.getByRole("button", { name: "Detener" })).toHaveCount(0);
    expect((await scrollPosition(page)).top).toBeCloseTo(beforeFinish.top, 0);

    // A new question deliberately brings its own reply into view.
    await page.locator(".chat-input textarea").fill("Otra pregunta");
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await scrollPosition(page)).gap).toBeLessThanOrEqual(1);
    await append(page, "Nueva respuesta.");
    await page.evaluate(() => (window as StreamWindow).chatStream.finish());
    await expect(page.getByRole("button", { name: "Detener" })).toHaveCount(0);
    await page.screenshot({ path: `test-results/chat-scroll-${width}.png` });
  });
}

test("Settings stays centered on desktop, phone and a short viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Configuración" }).click();
  for (const viewport of [{ width: 1440, height: 950 }, { width: 400, height: 850 }, { width: 400, height: 480 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.getByRole("dialog").evaluate((dialog) => {
      const rect = dialog.getBoundingClientRect();
      return Math.max(Math.abs(rect.left + rect.width / 2 - innerWidth / 2), Math.abs(rect.top + rect.height / 2 - innerHeight / 2));
    })).toBeLessThan(2);
    const rect = (await page.getByRole("dialog").boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(16);
    expect(rect.y).toBeGreaterThanOrEqual(20);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width - 16);
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height - 20);
    await page.screenshot({ path: `test-results/settings-centered-${viewport.width}-${viewport.height}.png` });
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("chat reserves the final notebook width once and honors reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 950 });
  await openNotebook(page, EVAL);
  const widths = await page.evaluate(() => new Promise<number[]>((resolve) => {
    const flow = document.querySelector<HTMLElement>(".flow")!;
    const widths = [flow.getBoundingClientRect().width];
    const started = performance.now();
    document.querySelector<HTMLButtonElement>(".ask-btn")!.click();
    const sample = () => {
      widths.push(flow.getBoundingClientRect().width);
      if (performance.now() - started < 350) requestAnimationFrame(sample);
      else resolve(widths);
    };
    requestAnimationFrame(sample);
  }));
  const distinct = new Set(widths.map((width) => Math.round(width)));
  expect(widths.at(-1)).toBeLessThan(widths[0]!);
  expect(distinct.size).toBeLessThanOrEqual(2);
  console.log(`Notebook width during chat entry: ${widths.length} frames, ${distinct.size} distinct widths (including the initial width).`);
  const sheet = (await page.locator(".sheet").boundingBox())!;
  const chat = (await page.locator(".chat").boundingBox())!;
  expect(sheet.x + sheet.width).toBeLessThanOrEqual(chat.x);
  await page.screenshot({ path: "test-results/chat-layout-fixed.png" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  // Motion's hook reads the OS preference when mounted, so load with that preference in place.
  await page.reload();
  await expect(page.locator(".flow")).toBeVisible();
  await page.keyboard.press("Control+j");
  await expect(page.locator(".chat")).toBeVisible();
  expect(await page.locator(".chat").evaluate((chat) => chat.getAnimations().filter((animation) =>
    animation.playState === "running" && Number(animation.effect?.getComputedTiming().activeDuration ?? 0) > 0,
  ).length)).toBe(0);
});

test("chat uses spare desk space before narrowing the notebook", async ({ page }) => {
  // 1504 / 1880 CSS px represent the same screen at 125% / 100% browser zoom.
  for (const width of [1440, 1504, 1530, 1880, 2350]) {
    await page.setViewportSize({ width, height: 950 });
    await openNotebook(page, EVAL);
    const initial = (await page.locator(".sheet").boundingBox())!;
    await page.getByRole("button", { name: "Preguntar", exact: true }).click();
    await expect(page.locator(".chat")).toBeVisible();
    await expect.poll(() => page.locator(".chat").evaluate((chat) => {
      const sheet = document.querySelector(".sheet")!.getBoundingClientRect();
      return chat.getBoundingClientRect().left - sheet.right;
    })).toBeGreaterThanOrEqual(11);
    const sheet = (await page.locator(".sheet").boundingBox())!;
    const chat = (await page.locator(".chat").boundingBox())!;
    expect(sheet.width).toBeCloseTo(initial.width, 0);
    expect(sheet.x).toBeLessThan(initial.x);
    expect(chat.width).toBeGreaterThanOrEqual(320);
    const layoutWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(chat.width).toBeCloseTo(Math.min(760, layoutWidth - initial.width - 40), 0);
    expect(chat.x + chat.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/chat-space-${width}.png` });
    await page.keyboard.press("Control+j");
    await expect(page.locator(".chat")).not.toBeVisible();
  }
});
