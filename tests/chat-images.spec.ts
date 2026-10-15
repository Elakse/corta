import { expect, test, type Page } from "@playwright/test";

// A synthetic camera feeds getUserMedia, and the camera permission is granted up front.
test.use({
  permissions: ["camera"],
  launchOptions: {
    executablePath: process.env.CORTA_CHROMIUM || undefined,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  },
});

/** A 1×1 PNG. */
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const png = (name: string) => ({ name, mimeType: "image/png", buffer: Buffer.from(PNG_B64, "base64") });

test.beforeEach(async ({ request }) => {
  await request.put("/api/settings/theme", { data: { value: "system" } });
  await request.put("/api/settings/camera.config", { data: { value: null } });
  await request.put("/api/llm/selection", { data: { provider: "mock", model: "mock" } });
});

async function openChat(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Preguntar", exact: true }).click();
  await expect(page.locator(".chat-input textarea")).toBeEnabled();
}

const pasteImage = (page: Page, withText = false) =>
  page.locator(".chat-input textarea").evaluate((el, [b64, text]) => {
    const bytes = Uint8Array.from(atob(b64!), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "pasted.png", { type: "image/png" }));
    if (text) data.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, [PNG_B64, withText ? "una celda copiada" : ""]);

type ChatBody = { messages: { role: string; content: string | { type: string; mediaType?: string }[] }[] };
const chatBodies = (page: Page) => {
  const bodies: ChatBody[] = [];
  page.on("request", (r) => { if (r.url().endsWith("/api/llm/chat")) bodies.push(r.postDataJSON() as ChatBody); });
  return bodies;
};

test("the send button is vertically centered in the composer", async ({ page }) => {
  await openChat(page);
  const send = (await page.locator(".chat-input .send").boundingBox())!;
  const field = (await page.locator(".chat-input textarea").boundingBox())!;
  expect(Math.abs(send.y + send.height / 2 - (field.y + field.height / 2))).toBeLessThan(2);
  // One line when empty: the placeholder sits on the buttons' centre line, not above it.
  expect(field.height).toBeLessThan(44);
  const tools = (await page.locator(".chat-tools").boundingBox())!;
  expect(Math.abs(tools.y + tools.height / 2 - (field.y + field.height / 2))).toBeLessThan(2);
  // It grows with the text instead of staying two lines tall.
  await page.locator(".chat-input textarea").fill("uno\ndos\ntres");
  expect((await page.locator(".chat-input textarea").boundingBox())!.height).toBeGreaterThan(field.height + 30);
});

test("images attach from files and the clipboard, up to three, and travel with the question", async ({ page }) => {
  await openChat(page);
  const bodies = chatBodies(page);
  const input = page.locator(".chat-tools input[type=file]");

  await input.setInputFiles(png("a.png"));
  await expect(page.locator(".chat-thumb")).toHaveCount(1);
  await pasteImage(page);
  await expect(page.locator(".chat-thumb")).toHaveCount(2);
  // text on the clipboard wins: copying a cell also puts a picture of it there
  await pasteImage(page, true);
  await expect(page.locator(".chat-thumb")).toHaveCount(2);
  // the limit is three: a fourth image is refused with a notice
  await input.setInputFiles([png("b.png"), png("c.png")]);
  await expect(page.locator(".chat-thumb")).toHaveCount(3);
  await expect(page.locator(".toast")).toContainText("Máximo 3");
  await expect(page.getByRole("button", { name: "Adjuntar imagen" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sacar una foto" })).toBeDisabled();
  // taking one back frees the slot
  await page.getByRole("button", { name: "Quitar imagen" }).first().click({ force: true });
  await expect(page.locator(".chat-thumb")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Adjuntar imagen" })).toBeEnabled();

  await page.locator(".chat-input textarea").fill("¿qué dice acá?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".m-user img")).toHaveCount(2);
  await expect(page.locator(".m-assistant").last()).toContainText("Recibí 2 imágenes");
  await expect(page.locator(".chat-thumb")).toHaveCount(0);
  const last = bodies[0]!.messages.at(-1)!.content as { type: string; mediaType?: string }[];
  expect(last.map((b) => b.type)).toEqual(["text", "image", "image"]);
  expect(last[1]!.mediaType).toBe("image/jpeg");

  // the images stay in the conversation for the next question
  await page.locator(".chat-input textarea").fill("¿y el segundo renglón?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".m-assistant")).toHaveCount(2);
  const first = bodies[1]!.messages[0]!.content as { type: string }[];
  expect(first.filter((b) => b.type === "image")).toHaveLength(2);
});

test("a photo alone is a question: it goes with a default prompt", async ({ page }) => {
  await openChat(page);
  await page.locator(".chat-tools input[type=file]").setInputFiles(png("a.png"));
  await expect(page.locator(".chat-input .send")).toBeEnabled();
  await page.keyboard.press("Control+a"); // nothing typed: Enter in the box
  await page.locator(".chat-input textarea").press("Enter");
  await expect(page.locator(".m-user")).toContainText("Fijate en esto");
  await expect(page.locator(".m-assistant").last()).toContainText("Recibí 1 imagen");
});

test("a model that cannot see images says so in the chat", async ({ page }) => {
  await openChat(page);
  await page.route("**/api/llm/chat", (route) =>
    route.fulfill({ contentType: "text/event-stream", body: `data: ${JSON.stringify({ type: "error", message: "raw upstream text", code: "images_unsupported" })}\n\n` }));
  await page.locator(".chat-tools input[type=file]").setInputFiles(png("a.png"));
  await page.locator(".chat-input textarea").fill("mirá");
  await page.keyboard.press("Enter");
  await expect(page.locator(".m-error")).toContainText("no puede procesar imágenes");
  await expect(page.locator(".m-error")).not.toContainText("raw upstream text");
});

/** Mean and spread of the picture on a canvas: a live, non-flat image has both. */
const picture = (page: Page, selector: string) =>
  page.locator(selector).evaluate((c: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = c.width; copy.height = c.height;
    const ctx = copy.getContext("2d")!;
    ctx.drawImage(c, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let min = 255, max = 0, sum = 0;
    for (let i = 0; i < data.length; i += 4 * 97) { const v = data[i]! + data[i + 1]! + data[i + 2]!; sum += v; min = Math.min(min, v / 3); max = Math.max(max, v / 3); }
    return { width: c.width, height: c.height, spread: max - min, mean: sum / (data.length / (4 * 97)) };
  });

test("camera setup: live preview, perspective and crop marks, and the choice survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Configuración" }).click();
  await page.getByRole("button", { name: "Configurar cámara" }).click();
  const dialog = page.locator("dialog.cam-dialog[open]");
  await expect(dialog).toBeVisible();
  // the first start of the (fake) camera can take a moment
  await expect(page.locator(".cam-canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".cam-unavailable")).toHaveCount(0);
  await expect.poll(async () => (await picture(page, ".cam-canvas")).spread, { timeout: 10_000 }).toBeGreaterThan(20);

  await page.getByRole("button", { name: "Espejo horizontal" }).click();
  await expect(page.getByRole("button", { name: "Espejo horizontal" })).toHaveAttribute("aria-pressed", "true");
  const brightness = page.locator(".cam-slider input").first();
  await brightness.focus();
  await page.keyboard.press("End");
  await expect(page.locator(".cam-slider output").first()).toHaveText("+100");
  await brightness.dblclick();
  await expect(page.locator(".cam-slider output").first()).toHaveText("0");
  await brightness.focus();
  await page.keyboard.press("End");

  await page.getByRole("tab", { name: "Perspectiva" }).click();
  await page.getByRole("button", { name: "Marcar la hoja" }).click();
  await expect(page.locator(".cam-handle")).toHaveCount(4);
  await expect(page.locator(".cam-result canvas")).toBeVisible();
  const corner = page.getByRole("button", { name: "Esquina superior izquierda" });
  const before = await corner.boundingBox();
  await corner.hover();
  await page.mouse.down();
  await page.mouse.move(before!.x + 60, before!.y + 40, { steps: 5 });
  await page.mouse.up();
  const after = await corner.boundingBox();
  expect(after!.x).toBeGreaterThan(before!.x + 30);
  // the straightened sheet is shown with the proportions picked
  await page.getByRole("button", { name: "A4" }).click();
  await expect.poll(async () => { const r = await picture(page, ".cam-result canvas"); return r.width / r.height; }).toBeCloseTo(Math.SQRT2, 1);

  await page.getByRole("tab", { name: "Recorte" }).click();
  await page.getByRole("button", { name: "Recortar", exact: true }).click();
  await expect(page.locator(".cam-handle")).toHaveCount(4);
  await page.getByRole("button", { name: "Listo" }).click();
  await expect(dialog).toHaveCount(0);

  await expect.poll(async () => (await (await page.request.get("/api/settings/camera.config")).json()).value?.brightness).toBe(100);
  const saved = (await (await page.request.get("/api/settings/camera.config")).json()).value;
  expect(saved).toMatchObject({ flipH: true, aspect: "a4" });
  expect(saved.perspective).toHaveLength(4);
  expect(saved.crop).toBeTruthy();

  await page.reload();
  await page.getByRole("button", { name: "Configuración" }).click();
  await page.getByRole("button", { name: "Configurar cámara" }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Espejo horizontal" })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Restablecer" }).click();
  await expect(page.getByRole("button", { name: "Espejo horizontal" })).toHaveAttribute("aria-pressed", "false");
});

test("photo dialog: take a photo, review it and attach it; Escape closes only the dialog", async ({ page }) => {
  await openChat(page);
  await page.getByRole("button", { name: "Sacar una foto" }).click();
  const dialog = page.locator("dialog.cam-capture[open]");
  await expect(dialog).toBeVisible();
  const shutter = page.getByRole("button", { name: "Sacar foto" });
  await expect(shutter).toBeEnabled({ timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".chat")).toBeVisible();

  await page.getByRole("button", { name: "Sacar una foto" }).click();
  await expect(shutter).toBeEnabled({ timeout: 10_000 });
  await shutter.click();
  await expect(page.locator(".cam-still")).toBeVisible();
  await page.getByRole("button", { name: "Repetir" }).click();
  await expect(page.locator(".cam-still")).toHaveCount(0);
  await shutter.click();
  await page.getByRole("button", { name: "Usar foto" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".chat-thumb")).toHaveCount(1);
});
