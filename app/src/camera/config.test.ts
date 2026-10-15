import { describe, expect, it } from "vitest";
import { DEFAULT_CAMERA_CONFIG, resetLook, sanitizeCameraConfig } from "./config";
import { insetQuad } from "./geometry";
import { sheetAspect, stageSize, stageUniforms } from "./pipeline";

const frame = { w: 1280, h: 720 };

describe("sanitizeCameraConfig", () => {
  it("returns the defaults for anything unusable", () => {
    for (const raw of [undefined, null, "x", 3, [], {}]) expect(sanitizeCameraConfig(raw)).toEqual(DEFAULT_CAMERA_CONFIG);
  });
  it("keeps valid saved values and clamps the rest", () => {
    const saved = { deviceId: "cam-1", flipH: true, flipV: false, brightness: 20, contrast: -30, saturation: 5, perspective: insetQuad(0.1), aspect: "a4", crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } };
    expect(sanitizeCameraConfig(saved)).toEqual(saved);
    const wild = sanitizeCameraConfig({ brightness: 900, contrast: -900, saturation: "lots", aspect: "wide", deviceId: "", crop: { x: 0.9, y: 0.9, w: 5, h: 5 } });
    expect(wild).toMatchObject({ brightness: 100, contrast: -100, saturation: 0, aspect: "auto", deviceId: null });
    expect(wild.crop!.x + wild.crop!.w).toBeLessThanOrEqual(1);
    expect(wild.crop!.y + wild.crop!.h).toBeLessThanOrEqual(1);
  });
  it("drops quads that are twisted, degenerate or malformed, and crops that cover everything", () => {
    const twisted = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.9, y: 0.1 }, { x: 0.1, y: 0.9 }];
    expect(sanitizeCameraConfig({ perspective: twisted }).perspective).toBeNull();
    expect(sanitizeCameraConfig({ perspective: [{ x: 0, y: 0 }] }).perspective).toBeNull();
    expect(sanitizeCameraConfig({ perspective: [1, 2, 3, 4] }).perspective).toBeNull();
    expect(sanitizeCameraConfig({ crop: { x: 0, y: 0, w: 1, h: 1 } }).crop).toBeNull();
  });
  it("resets the look but keeps the chosen camera", () => {
    const cfg = sanitizeCameraConfig({ deviceId: "cam-1", flipH: true, brightness: 40, perspective: insetQuad(0.1) });
    expect(resetLook(cfg)).toEqual({ ...DEFAULT_CAMERA_CONFIG, deviceId: "cam-1" });
  });
});

describe("pipeline", () => {
  const base = DEFAULT_CAMERA_CONFIG;
  it("is the identity by default", () => {
    expect(stageSize(base, frame, "final", 4000)).toEqual({ w: 1280, h: 720 });
    expect(stageUniforms(base, "final")).toEqual({ homography: [1, 0, 0, 0, 1, 0, 0, 0, 1], crop: [0, 0, 1, 1], flip: [0, 0], adjust: [0, 0, 0] });
  });
  it("never exceeds the largest side", () => {
    expect(stageSize(base, frame, "final", 1000)).toEqual({ w: 1000, h: 563 });
  });
  it("sizes the straightened sheet from its proportions and crops it", () => {
    const cfg = { ...base, perspective: insetQuad(0.1), aspect: "a4" as const };
    expect(sheetAspect(cfg, frame)).toBeCloseTo(Math.SQRT2, 9); // landscape, like the quad
    const rectified = stageSize(cfg, frame, "rectified", 4000);
    expect(rectified.w / rectified.h).toBeCloseTo(Math.SQRT2, 1);
    const cropped = stageSize({ ...cfg, crop: { x: 0, y: 0, w: 0.5, h: 1 } }, frame, "final", 4000);
    expect(cropped.w).toBeCloseTo(rectified.w / 2, -1);
    expect(cropped.h).toBe(rectified.h);
    // the frame stage ignores perspective and crop
    expect(stageSize({ ...cfg, crop: { x: 0, y: 0, w: 0.5, h: 0.5 } }, frame, "frame", 4000)).toEqual(frame);
  });
  it("keeps a portrait sheet portrait with a standard size", () => {
    const portrait = { ...base, perspective: [{ x: 0.35, y: 0.05 }, { x: 0.65, y: 0.05 }, { x: 0.65, y: 0.95 }, { x: 0.35, y: 0.95 }] as never, aspect: "letter" as const };
    expect(sheetAspect(portrait, frame)).toBeCloseTo(8.5 / 11, 9);
  });
  it("turns slider values into shader amounts and flips into flags", () => {
    const u = stageUniforms({ ...base, flipH: true, brightness: 100, contrast: -50, saturation: 50, crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } }, "final");
    expect(u.flip).toEqual([1, 0]);
    expect(u.crop).toEqual([0.1, 0.2, 0.5, 0.5]);
    expect(u.adjust[0]).toBeCloseTo(0.35);
    expect(u.adjust[1]).toBeCloseTo(-0.4);
    expect(u.adjust[2]).toBeCloseTo(0.5);
    expect(stageUniforms({ ...base, crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } }, "rectified").crop).toEqual([0, 0, 1, 1]);
  });
});
