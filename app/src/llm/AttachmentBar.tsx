import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Paperclip, X } from "lucide-react";
import { useT } from "@/i18n";
import { MAX_ATTACHMENTS, type Attachment } from "./attachments";

/** What is attached to the message being written, each with a way to take it back. */
export function AttachmentThumbs({ items, onRemove }: { items: Attachment[]; onRemove: (id: string) => void }) {
  const t = useT();
  return (
    <div className="chat-thumbs">
      <AnimatePresence initial={false}>
        {items.map((a, i) => (
          <motion.div key={a.id} className="chat-thumb" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
            <img src={a.dataUrl} alt={t("chat.imageAlt", { n: i + 1 })} />
            <button type="button" onClick={() => onRemove(a.id)} aria-label={t("chat.removeImage")} title={t("chat.removeImage")}><X size={12} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ButtonsProps {
  disabled: boolean;
  /** the message already carries the most images it can */
  full: boolean;
  onFiles: (files: File[]) => void;
  onCamera: () => void;
}

/** Attach from the computer, or take a photo with the camera. */
export function AttachButtons({ disabled, full, onFiles, onCamera }: ButtonsProps) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const off = disabled || full;
  const limit = full ? t("chat.imageLimit", { n: MAX_ATTACHMENTS }) : undefined;
  return (
    <div className="chat-tools">
      <button type="button" className="icon-btn" disabled={off} title={limit ?? t("chat.attach")} aria-label={t("chat.attach")} onClick={() => input.current?.click()}><Paperclip size={18} /></button>
      <button type="button" className="icon-btn" disabled={off} title={limit ?? t("chat.takePhoto")} aria-label={t("chat.takePhoto")} onClick={onCamera}><Camera size={18} /></button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </div>
  );
}
