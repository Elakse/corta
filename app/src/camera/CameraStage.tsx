import { useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { CameraOff, LoaderCircle } from "lucide-react";
import { useT } from "@/i18n";
import { CameraCanvas, type CameraCanvasHandle } from "./CameraCanvas";
import type { CameraConfig } from "./config";
import type { Size } from "./geometry";
import type { Stage } from "./pipeline";
import type { CameraStream } from "./useCameraStream";

interface Props {
  stream: CameraStream;
  config: CameraConfig;
  stage: Stage;
  maxSide: number;
  /** marks drawn over the picture (they share its box, so they use frame coordinates) */
  children?: ReactNode;
  canvasRef?: Ref<CameraCanvasHandle>;
}

/** A small live copy of what the tutor will get, to judge marks that are drawn on a different picture. */
export function CameraResult({ video, config }: { video: HTMLVideoElement | null; config: CameraConfig }) {
  const t = useT();
  return (
    <div className="cam-result" role="img" aria-label={t("camera.result")}>
      <CameraCanvas video={video} config={config} stage="final" maxSide={640} />
    </div>
  );
}

/** The dark stage: the live picture sized to its own proportions, or a short reason why there is none. */
export function CameraStage({ stream, config, stage, maxSide, children, canvasRef }: Props) {
  const t = useT();
  const [size, setSize] = useState<Size>({ w: 16, h: 9 });
  const live = stream.status === "live";
  return (
    <div className="cam-stage">
      {live && (
        <div className="cam-frame" style={{ "--ar": size.w / size.h } as CSSProperties}>
          <CameraCanvas ref={canvasRef} className="cam-canvas" video={stream.video} config={config} stage={stage} maxSide={maxSide} onSize={setSize} />
          {children}
        </div>
      )}
      {!live && (
        <div className="cam-status" role="status">
          {stream.status === "starting" || stream.status === "idle" ? <LoaderCircle className="spin" size={26} /> : <CameraOff size={26} />}
          <span>{t(stream.status === "denied" ? "camera.denied" : stream.status === "missing" ? "camera.missing" : stream.status === "error" ? "camera.error" : "camera.starting")}</span>
        </div>
      )}
    </div>
  );
}
