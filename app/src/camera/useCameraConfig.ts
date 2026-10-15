import { useCallback, useMemo } from "react";
import { useSettings } from "@/state/settings";
import { CAMERA_SETTING_KEY, resetLook, sanitizeCameraConfig, type CameraConfig } from "./config";

/** The saved camera setup. Changes apply at once and are saved when they stop (see `flush`). */
export function useCameraConfig() {
  const raw = useSettings((s) => s.values[CAMERA_SETTING_KEY]);
  const config = useMemo(() => sanitizeCameraConfig(raw), [raw]);
  const current = () => sanitizeCameraConfig(useSettings.getState().values[CAMERA_SETTING_KEY]);
  const update = useCallback((patch: Partial<CameraConfig>) => {
    useSettings.getState().setDebounced(CAMERA_SETTING_KEY, sanitizeCameraConfig({ ...current(), ...patch }));
  }, []);
  const reset = useCallback(() => useSettings.getState().setDebounced(CAMERA_SETTING_KEY, resetLook(current())), []);
  const flush = useCallback(() => useSettings.getState().flush(CAMERA_SETTING_KEY), []);
  return { config, update, reset, flush };
}
