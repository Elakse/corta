import { useEffect, useImperativeHandle, useRef, useState, type ComponentProps, type Ref } from "react";
import { translate } from "@/i18n";
import type { CameraConfig } from "./config";
import type { Size } from "./geometry";
import type { Stage } from "./pipeline";
import { CameraRenderer } from "./renderer";

export interface CameraCanvasHandle {
  /** Redraws the current frame and hands back the canvas (valid until the next frame). */
  capture: () => HTMLCanvasElement | null;
}

interface Props extends Omit<ComponentProps<"canvas">, "ref" | "width" | "height"> {
  video: HTMLVideoElement | null;
  config: CameraConfig;
  stage: Stage;
  /** largest side in pixels */
  maxSide: number;
  /** called when the picture's size changes (the frame around it follows) */
  onSize?: (size: Size) => void;
  ref?: Ref<CameraCanvasHandle>;
}

/** Live camera picture through the pipeline up to `stage`. Several can share one video. */
export function CameraCanvas({ video, config, stage, maxSide, onSize, ref, ...canvasProps }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<CameraRenderer | null>(null);
  const latest = useRef({ config, stage, maxSide, onSize, video });
  latest.current = { config, stage, maxSide, onSize, video };
  const lastSize = useRef<Size | null>(null);
  const [failed, setFailed] = useState(false);

  function drawNow(): HTMLCanvasElement | null {
    const r = renderer.current;
    const { video: v, config: c, stage: s, maxSide: m, onSize: report } = latest.current;
    if (!r || !v || v.readyState < 2 || !v.videoWidth) return null;
    const size = r.draw(v, { w: v.videoWidth, h: v.videoHeight }, c, s, m);
    if (!lastSize.current || lastSize.current.w !== size.w || lastSize.current.h !== size.h) {
      lastSize.current = size;
      report?.(size);
    }
    return r.canvas;
  }
  useImperativeHandle(ref, () => ({ capture: drawNow }), []);

  useEffect(() => {
    if (!video || !canvas.current) return;
    try { renderer.current = new CameraRenderer(canvas.current); } catch { setFailed(true); return; }
    let stopped = false;
    let handle = 0;
    const schedule = () => {
      handle = "requestVideoFrameCallback" in video ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    const tick = () => {
      if (stopped) return;
      drawNow();
      schedule();
    };
    schedule();
    return () => {
      stopped = true;
      if ("cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
      renderer.current?.dispose();
      renderer.current = null;
      lastSize.current = null;
    };
  }, [video]);

  if (failed) return <div className="cam-unavailable" role="alert">{translate("camera.noWebgl")}</div>;
  return <canvas ref={canvas} {...canvasProps} />;
}
