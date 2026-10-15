/**
 * Camera pipeline, in order: flip → straighten the sheet (perspective) → crop → brightness/contrast/saturation.
 * Everything here is pure; `renderer.ts` runs the same maths on the GPU.
 */
import type { CameraConfig } from "./config";
import { edgeAspect, estimateAspect, FULL_RECT, IDENTITY, toColumnMajor, unitSquareToQuad, type Size } from "./geometry";

/** `frame`: the camera's picture (flipped). `rectified`: with the sheet straightened. `final`: what the tutor gets. */
export type Stage = "frame" | "rectified" | "final";

const A4 = Math.SQRT2;
const LETTER = 11 / 8.5;
/** How far each slider's ±100 reaches in the shader. */
export const ADJUST = { brightness: 0.35, contrast: 0.8, saturation: 1 } as const;

/** Width/height of the straightened sheet, or `null` without perspective. */
export function sheetAspect(config: CameraConfig, frame: Size): number | null {
  if (!config.perspective) return null;
  const seen = config.aspect === "auto" ? estimateAspect(config.perspective, frame) : edgeAspect(config.perspective, frame);
  if (config.aspect === "auto") return seen;
  const wanted = config.aspect === "a4" ? A4 : LETTER;
  // The standard size says the proportions; the picture says whether the sheet lies landscape or portrait.
  return seen >= 1 ? wanted : 1 / wanted;
}

function fit(size: Size, maxSide: number): Size {
  const scale = Math.min(1, maxSide / Math.max(size.w, size.h));
  return { w: Math.max(16, Math.round(size.w * scale)), h: Math.max(16, Math.round(size.h * scale)) };
}

/** Pixel size of the canvas for a stage: never bigger than the source detail, never past `maxSide`. */
export function stageSize(config: CameraConfig, frame: Size, stage: Stage, maxSide: number): Size {
  const aspect = sheetAspect(config, frame);
  let size: Size = frame;
  if (stage !== "frame" && aspect !== null && config.perspective) {
    const q = config.perspective;
    const px = (a: number, b: number, c: number, d: number) => Math.hypot((a - c) * frame.w, (b - d) * frame.h);
    const top = px(q[0].x, q[0].y, q[1].x, q[1].y), bottom = px(q[3].x, q[3].y, q[2].x, q[2].y);
    const left = px(q[0].x, q[0].y, q[3].x, q[3].y), right = px(q[1].x, q[1].y, q[2].x, q[2].y);
    const w = Math.max(Math.max(top, bottom), Math.max(left, right) * aspect);
    size = { w, h: w / aspect };
  }
  if (stage === "final" && config.crop) size = { w: size.w * config.crop.w, h: size.h * config.crop.h };
  return fit(size, maxSide);
}

export interface Uniforms {
  /** output rectangle → flipped frame, column-major */
  homography: number[];
  crop: [number, number, number, number];
  flip: [number, number];
  /** brightness (added), contrast (factor − 1), saturation (factor − 1) */
  adjust: [number, number, number];
}

export function stageUniforms(config: CameraConfig, stage: Stage): Uniforms {
  const rectified = stage !== "frame" && config.perspective;
  const crop = stage === "final" && config.crop ? config.crop : FULL_RECT;
  return {
    homography: toColumnMajor(rectified ? unitSquareToQuad(config.perspective!) : IDENTITY),
    crop: [crop.x, crop.y, crop.w, crop.h],
    flip: [config.flipH ? 1 : 0, config.flipV ? 1 : 0],
    adjust: [(config.brightness / 100) * ADJUST.brightness, (config.contrast / 100) * ADJUST.contrast, (config.saturation / 100) * ADJUST.saturation],
  };
}
