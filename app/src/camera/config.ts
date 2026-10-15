/** What the user saved about their camera: orientation, look, and which part of the picture is the sheet. */
import { clamp, FULL_RECT, isConvexQuad, type Point, type Quad, type Rect } from "./geometry";

export const CAMERA_SETTING_KEY = "camera.config";
export const ASPECTS = ["auto", "a4", "letter"] as const;
export type AspectMode = (typeof ASPECTS)[number];

export interface CameraConfig {
  /** `null` = the browser's default camera */
  deviceId: string | null;
  flipH: boolean;
  flipV: boolean;
  /** -100..100; 0 leaves the picture as the camera gives it */
  brightness: number;
  contrast: number;
  saturation: number;
  /** The sheet's four corners in the (flipped) frame, straightened into a rectangle. `null` = off. */
  perspective: Quad | null;
  /** Proportions of the straightened sheet */
  aspect: AspectMode;
  /** Part of the straightened picture to keep. `null` = all of it. */
  crop: Rect | null;
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  deviceId: null, flipH: false, flipV: false, brightness: 0, contrast: 0, saturation: 0, perspective: null, aspect: "auto", crop: null,
};

const number = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : fallback);
const point = (v: unknown): Point | null => {
  const p = v as Partial<Point> | null;
  return p && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y)
    ? { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) } : null;
};

function quad(v: unknown): Quad | null {
  if (!Array.isArray(v) || v.length !== 4) return null;
  const points = v.map(point);
  return points.every(Boolean) && isConvexQuad(points as Quad) ? (points as Quad) : null;
}

function rect(v: unknown): Rect | null {
  const r = v as Partial<Rect> | null;
  if (!r || ![r.x, r.y, r.w, r.h].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const x = clamp(r.x!, 0, 0.95), y = clamp(r.y!, 0, 0.95);
  const w = clamp(r.w!, 0.05, 1 - x), h = clamp(r.h!, 0.05, 1 - y);
  return x === FULL_RECT.x && y === FULL_RECT.y && w === FULL_RECT.w && h === FULL_RECT.h ? null : { x, y, w, h };
}

/** Settings come from disk and from older versions: anything unusable falls back to its default. */
export function sanitizeCameraConfig(raw: unknown): CameraConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CAMERA_CONFIG;
  return {
    deviceId: typeof r.deviceId === "string" && r.deviceId ? r.deviceId : null,
    flipH: r.flipH === true,
    flipV: r.flipV === true,
    brightness: Math.round(number(r.brightness, -100, 100, d.brightness)),
    contrast: Math.round(number(r.contrast, -100, 100, d.contrast)),
    saturation: Math.round(number(r.saturation, -100, 100, d.saturation)),
    perspective: quad(r.perspective),
    aspect: ASPECTS.includes(r.aspect as AspectMode) ? (r.aspect as AspectMode) : d.aspect,
    crop: rect(r.crop),
  };
}

/** Back to the camera's own picture, keeping which camera is in use. */
export const resetLook = (config: CameraConfig): CameraConfig => ({ ...DEFAULT_CAMERA_CONFIG, deviceId: config.deviceId });
