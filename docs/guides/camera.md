# Camera and image attachments

The tutor chat takes up to **3 images** per question: files, clipboard paste, or a webcam photo.
Settings → *Configurar cámara* opens a dialog to straighten and tune the webcam picture (to show a
paper sheet lying on the desk). The choice is saved and applied to every photo.

## Flow

1. Chat form: attach button (file picker, `image/*`), camera button (opens `CaptureDialog`: live preview
   → capture → confirm/retake), and paste (`onPaste`). Pasting an image only counts when the clipboard
   has no `text/plain`, so copying from a web page never turns into an attachment.
2. `llm/attachments.ts` prepares each image once: downsized to 1600px on the long side, JPEG quality
   0.88 (transparency → white). Thumbnails sit above the input with a remove button.
3. The request carries `image` content blocks (`{type:"image", mediaType, data}`, base64) in the
   provider-neutral history (`shared/api.ts`: `MAX_CHAT_IMAGES = 3`, `MAX_CHAT_IMAGE_BASE64`).
4. Adapters translate: Chat Completions → `image_url` data URLs; Anthropic Messages → base64 `source`
   blocks placed before the text. Images stay in the conversation history **in memory only** (not in the DB).

## Models without vision

There is no capability table. Images are always sent. If the provider rejects them
(`server/src/llm/images.ts`: status 400/404/415/422 plus a body that mentions images), the server raises
`ChatError("images_unsupported")`; the SSE stream sends `{type:"error", message, code}` and
`llm/errors.ts` shows a plain chat message saying the model can't process images. Upstream bodies are never
forwarded. **OpenCode Go / DeepSeek image support was not verified** (the network allowlist blocked the
probe), so this path is how it will report if the model lacks vision. The mock provider answers
"Recibí N imagen(es)".

## Camera pipeline (`app/src/camera/`)

| File | Role |
|---|---|
| `config.ts` | `CameraConfig` (device, flipH/V, brightness/contrast/saturation −100..100, `perspective` quad, `aspect`, `crop`), defaults, `sanitizeCameraConfig` (anything invalid → default) |
| `geometry.ts` | Pure maths: homography unit-square→quad, convex check, `estimateAspect` (Zhang & He 2007), `dragRect` |
| `pipeline.ts` | Pure: stage sizes and shader uniforms per stage (`frame` / `rectified` / `final`) |
| `renderer.ts` | One WebGL fragment shader, `preserveDrawingBuffer` so capture can read pixels |
| `useCameraStream.ts` | `getUserMedia` with an `ideal` deviceId, device list, releases tracks on stop/cancel |
| `CameraCanvas.tsx`, `CameraStage.tsx` | Canvas driven by `requestVideoFrameCallback`; `CameraResult` is the small final-result preview |
| `Overlays.tsx` | `QuadEditor` (4 draggable corners) and `CropEditor` (rect with handles) |
| `CalibrationDialog.tsx`, `CaptureDialog.tsx` | The two dialogs, built on `ui/Modal` |
| `useCameraConfig.ts` | Loads the saved config, debounced saves, flush on close |

Shader order: **flip → perspective (homography) → crop → brightness/contrast/saturation**. Each editor
works in its own coordinate frame: the corner editor on the *flipped* camera frame, the crop editor on the
*straightened* sheet. Changing the flip does not move saved corners incorrectly because corners are stored
on the flipped frame.

Sheet proportions: `auto` estimates the true aspect from the quad (focal length recovered from the quad,
accepted only in 0.4–3 × frame width, otherwise falls back to edge lengths); `a4` / `letter` fix it.

Persistence: setting key `camera.config`, sanitized on read. `settings.setDebounced(key, value)` coalesces
slider drags (350 ms); `settings.flush(key)` runs when the dialog closes.

## Dialog rules

- `ui/Modal` wraps a native `<dialog>` and mounts its children **only while open**, so the camera stream
  is released when it closes. Reuse it for new dialogs (Settings could be moved onto it).
- `Shell` ignores global shortcuts and Escape while any `dialog[open]` exists.
- Stage colors use theme tokens `stage` / `stage-ink` (video surfaces stay dark in both themes).

## Extending

- New adjustment (e.g. sharpen): add the field to `CameraConfig` + `sanitizeCameraConfig`, a uniform in
  `pipeline.ts`, a line in the shader, and a `Slider` in `CalibrationDialog`. Add i18n strings in es/en.
- New provider protocol: translate the `image` block in its adapter and map its rejection to `ChatError`.
- Tests: `app/src/camera/*.test.ts`, `server/src/llm/images.test.ts`, and `tests/chat-images.spec.ts`
  (e2e with Chromium's fake camera; see `run-tests.md`).
