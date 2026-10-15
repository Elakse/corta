/** Images the user attaches to a question: prepared once (downsized, JPEG), kept as small as the tutor needs. */
import { useCallback, useRef, useState } from "react";
import { MAX_CHAT_IMAGES } from "@shared/api";
import { translate } from "@/i18n";
import { toast } from "@/state/toast";

export const MAX_ATTACHMENTS = MAX_CHAT_IMAGES;
/** Enough to read handwriting on a sheet; small enough that a few of them stay cheap in every turn. */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.88;

export interface Attachment {
  id: string;
  /** for thumbnails */
  dataUrl: string;
  mediaType: "image/jpeg";
  /** base64 without the `data:` prefix: what the API carries */
  data: string;
}

/** Downsizes and JPEG-encodes any drawable. Transparent pixels become white, as JPEG has no alpha. */
export function attachmentFromSource(source: CanvasImageSource, width: number, height: number): Attachment {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white"; // the picture's own background, not a UI color
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { id: crypto.randomUUID(), dataUrl, mediaType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

export const attachmentFromCanvas = (canvas: HTMLCanvasElement) => attachmentFromSource(canvas, canvas.width, canvas.height);

export async function attachmentFromFile(file: File): Promise<Attachment> {
  const bitmap = await createImageBitmap(file);
  try { return attachmentFromSource(bitmap, bitmap.width, bitmap.height); }
  finally { bitmap.close(); }
}

/**
 * Images on the clipboard, but only when it holds no text: copying a cell or a paragraph also puts a picture
 * of it there, and the text is what was meant. A screenshot or a copied image carries no text.
 */
export function imagesFromClipboard(data: DataTransfer | null): File[] {
  if (!data || data.getData("text/plain")) return [];
  return [...data.files].filter((f) => f.type.startsWith("image/"));
}

/** What is attached to the message being written. */
export function useAttachments() {
  const [items, setItems] = useState<Attachment[]>([]);
  const count = useRef(0);
  count.current = items.length;

  const add = useCallback((more: Attachment[]) => setItems((cur) => [...cur, ...more].slice(0, MAX_ATTACHMENTS)), []);
  const addFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    const picked = images.slice(0, Math.max(0, MAX_ATTACHMENTS - count.current));
    if (picked.length < images.length) toast(translate("chat.imageLimit", { n: MAX_ATTACHMENTS }));
    const results = await Promise.allSettled(picked.map(attachmentFromFile));
    add(results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])));
    if (results.some((r) => r.status === "rejected")) toast(translate("chat.imageFailed"), "error");
  }, [add]);
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((a) => a.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  return { items, full: items.length >= MAX_ATTACHMENTS, add, addFiles, remove, clear };
}
