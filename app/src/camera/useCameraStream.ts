import { useEffect, useState } from "react";
import { translate } from "@/i18n";

export type CameraStatus = "idle" | "starting" | "live" | "denied" | "missing" | "error";
export interface CameraDevice { id: string; label: string }
export interface CameraStream {
  /** a playing, detached <video>; the renderer reads frames from it */
  video: HTMLVideoElement | null;
  status: CameraStatus;
  devices: CameraDevice[];
  /** the camera actually in use (the default one when none was chosen) */
  activeDeviceId: string | null;
}

const idle: CameraStream = { video: null, status: "idle", devices: [], activeDeviceId: null };

async function listCameras(): Promise<CameraDevice[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || translate("camera.deviceN", { n: i + 1 }) }));
}

function classify(error: unknown): CameraStatus {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "missing";
  return "error";
}

/** Opens the camera while `active` and releases it as soon as it is not (the light must go off). */
export function useCameraStream(deviceId: string | null, active: boolean): CameraStream {
  const [state, setState] = useState<CameraStream>(idle);

  useEffect(() => {
    if (!active) { setState(idle); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setState({ ...idle, status: "error" }); return; }
    let cancelled = false;
    let stream: MediaStream | undefined;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    setState((s) => ({ ...s, status: "starting", video: null }));
    (async () => {
      try {
        // `ideal`: a camera that was unplugged falls back to the default one instead of failing.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { ...(deviceId ? { deviceId: { ideal: deviceId } } : {}), width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        // Closed while the permission prompt or the device was still opening: the camera must not stay on.
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        // Labels only exist once the permission was granted.
        setState({ status: "live", video, devices: await listCameras(), activeDeviceId: stream.getVideoTracks()[0]?.getSettings().deviceId ?? null });
      } catch (error) {
        if (!cancelled) setState((s) => ({ ...s, status: classify(error), video: null }));
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [deviceId, active]);

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.addEventListener) return;
    const refresh = () => void listCameras().then((devices) => setState((s) => (s.status === "live" ? { ...s, devices } : s))).catch(() => undefined);
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, [active]);

  return state;
}
