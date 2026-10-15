import { useRef, useState } from "react";
import { Camera, Check, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { attachmentFromCanvas, type Attachment } from "@/llm/attachments";
import { useT } from "@/i18n";
import { toast } from "@/state/toast";
import { useUi } from "@/state/ui";
import { Modal } from "@/ui/Modal";
import { CameraStage } from "./CameraStage";
import type { CameraCanvasHandle } from "./CameraCanvas";
import { useCameraConfig } from "./useCameraConfig";
import { useCameraStream } from "./useCameraStream";
import "./camera.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (photo: Attachment) => void;
}

/** Take a photo through the saved camera setup, look at it, keep it or retake it. */
export function CaptureDialog({ open, onClose, onCapture }: Props) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} label={t("chat.takePhoto")} className="cam-dialog cam-capture">
      <Capturer onClose={onClose} onCapture={onCapture} />
    </Modal>
  );
}

function Capturer({ onClose, onCapture }: Omit<Props, "open">) {
  const t = useT();
  const { config } = useCameraConfig();
  const setupOpen = useUi((s) => s.cameraSetupOpen);
  // The calibration dialog opens on top and needs the camera: let go of it meanwhile.
  const stream = useCameraStream(config.deviceId, !setupOpen);
  const canvas = useRef<CameraCanvasHandle>(null);
  const [still, setStill] = useState<Attachment | null>(null);

  function shoot() {
    const picture = canvas.current?.capture();
    if (!picture) return;
    try { setStill(attachmentFromCanvas(picture)); }
    catch { toast(t("chat.imageFailed"), "error"); }
  }

  return (
    <>
      <header className="cam-head">
        <h2>{t("chat.takePhoto")}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t("settings.close")}><X size={19} /></button>
      </header>
      <div className="cam-capture-body">
        <CameraStage stream={stream} config={config} stage="final" maxSide={1600} canvasRef={canvas}>
          {still && <><img className="cam-still" src={still.dataUrl} alt="" /><span className="cam-flash" aria-hidden /></>}
        </CameraStage>
        <div className="cam-capture-bar">
          <button className="icon-btn" onClick={() => useUi.getState().setCameraSetupOpen(true)} title={t("camera.adjust")} aria-label={t("camera.adjust")}><SlidersHorizontal size={19} /></button>
          {still ? (
            <div className="cam-review">
              <button className="ghost-btn" onClick={() => setStill(null)}><RotateCcw size={15} />{t("camera.retake")}</button>
              <button className="primary-btn" autoFocus onClick={() => { onCapture(still); onClose(); }}><Check size={17} />{t("camera.use")}</button>
            </div>
          ) : (
            <button className="cam-shutter" autoFocus disabled={stream.status !== "live"} onClick={shoot} aria-label={t("camera.shutter")} title={t("camera.shutter")}><Camera size={26} aria-hidden /></button>
          )}
          <span />
        </div>
      </div>
    </>
  );
}
