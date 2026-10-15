import { useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { Contrast, Crop, Droplets, FlipHorizontal2, FlipVertical2, RotateCcw, Scan, SlidersHorizontal, Sun, X, type LucideProps } from "lucide-react";
import { useT, type StringKey } from "@/i18n";
import { useUi } from "@/state/ui";
import { Modal } from "@/ui/Modal";
import { ASPECTS } from "./config";
import { CameraResult, CameraStage } from "./CameraStage";
import { insetQuad } from "./geometry";
import { CropEditor, QuadEditor } from "./Overlays";
import type { Stage } from "./pipeline";
import { Slider } from "./Slider";
import { useCameraConfig } from "./useCameraConfig";
import { useCameraStream } from "./useCameraStream";
import "./camera.css";

type Tab = "image" | "perspective" | "crop";
const TABS: { id: Tab; Icon: ComponentType<LucideProps>; label: StringKey }[] = [
  { id: "image", Icon: SlidersHorizontal, label: "camera.tab.image" },
  { id: "perspective", Icon: Scan, label: "camera.tab.perspective" },
  { id: "crop", Icon: Crop, label: "camera.tab.crop" },
];
/** What the preview shows while each tab is being edited: the marks live in that picture's coordinates. */
const STAGE: Record<Tab, Stage> = { image: "final", perspective: "frame", crop: "rectified" };
const CROP_INSET = 0.1;
const SHEET_INSET = 0.12;

/** Camera setup: a live preview you can calibrate against the real desk. Opened from Settings. */
export function CalibrationDialog() {
  const t = useT();
  const open = useUi((s) => s.cameraSetupOpen);
  const setOpen = useUi((s) => s.setCameraSetupOpen);
  const { flush } = useCameraConfig();
  const close = () => { flush(); setOpen(false); };
  return (
    <Modal open={open} onClose={close} label={t("camera.title")} className="cam-dialog">
      <Calibrator onClose={close} />
    </Modal>
  );
}

function Calibrator({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { config, update, reset } = useCameraConfig();
  const stream = useCameraStream(config.deviceId, true);
  const [tab, setTab] = useState<Tab>("image");
  return (
    <>
      <header className="cam-head">
        <h2>{t("camera.title")}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t("settings.close")}><X size={19} /></button>
      </header>
      <div className="cam-body">
        <CameraStage stream={stream} config={config} stage={STAGE[tab]} maxSide={1280}>
          {tab === "perspective" && config.perspective && <QuadEditor quad={config.perspective} onChange={(perspective) => update({ perspective })} />}
          {tab === "crop" && config.crop && <CropEditor rect={config.crop} onChange={(crop) => update({ crop })} />}
        </CameraStage>
        <aside className="cam-controls">
          <div className="settings-field">
            <label htmlFor="cam-device">{t("camera.device")}</label>
            <select id="cam-device" value={config.deviceId ?? ""} onChange={(e) => update({ deviceId: e.target.value || null })}>
              <option value="">{t("camera.deviceDefault")}</option>
              {stream.devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div className="cam-tabs" role="tablist" aria-label={t("camera.tabs")}>
            {TABS.map(({ id, Icon, label }) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className="cam-tab" onClick={() => setTab(id)}>
                {tab === id && <motion.span layoutId="cam-tab-bg" className="cam-tab-bg" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <Icon size={17} aria-hidden />
                <span>{t(label)}</span>
              </button>
            ))}
          </div>

          {tab === "image" && (
            <>
              <div className="theme-choices" role="group">
                <button type="button" aria-pressed={config.flipH} onClick={() => update({ flipH: !config.flipH })}><FlipHorizontal2 size={18} />{t("camera.flipH")}</button>
                <button type="button" aria-pressed={config.flipV} onClick={() => update({ flipV: !config.flipV })}><FlipVertical2 size={18} />{t("camera.flipV")}</button>
              </div>
              <div className="cam-sliders">
                <Slider icon={Sun} label={t("camera.brightness")} value={config.brightness} onChange={(brightness) => update({ brightness })} hint={t("camera.sliderReset")} />
                <Slider icon={Contrast} label={t("camera.contrast")} value={config.contrast} onChange={(contrast) => update({ contrast })} hint={t("camera.sliderReset")} />
                <Slider icon={Droplets} label={t("camera.saturation")} value={config.saturation} onChange={(saturation) => update({ saturation })} hint={t("camera.sliderReset")} />
              </div>
            </>
          )}

          {tab === "perspective" && (config.perspective ? (
            <>
              <p className="cam-hint">{t("camera.perspective.hint")}</p>
              <div className="cam-seg" role="group" aria-label={t("camera.aspect")}>
                {ASPECTS.map((a) => <button key={a} type="button" aria-pressed={config.aspect === a} onClick={() => update({ aspect: a })}>{t(`camera.aspect.${a}`)}</button>)}
              </div>
              <button className="ghost-btn cam-clear" onClick={() => update({ perspective: null })}><X size={15} />{t("camera.perspective.clear")}</button>
            </>
          ) : (
            <button className="primary-btn" onClick={() => update({ perspective: insetQuad(SHEET_INSET) })}><Scan size={17} />{t("camera.perspective.mark")}</button>
          ))}

          {tab === "crop" && (config.crop ? (
            <>
              <p className="cam-hint">{t("camera.crop.hint")}</p>
              <button className="ghost-btn cam-clear" onClick={() => update({ crop: null })}><X size={15} />{t("camera.crop.clear")}</button>
            </>
          ) : (
            <button className="primary-btn" onClick={() => update({ crop: { x: CROP_INSET, y: CROP_INSET, w: 1 - 2 * CROP_INSET, h: 1 - 2 * CROP_INSET } })}><Crop size={17} />{t("camera.crop.mark")}</button>
          ))}

          {tab !== "image" && (config.perspective || config.crop) && <CameraResult video={stream.video} config={config} />}

          <footer className="cam-foot">
            <button className="ghost-btn" onClick={reset}><RotateCcw size={15} />{t("camera.reset")}</button>
            <button className="primary-btn" onClick={onClose}>{t("camera.done")}</button>
          </footer>
        </aside>
      </div>
    </>
  );
}
