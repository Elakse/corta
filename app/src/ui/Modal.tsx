import { useEffect, useRef, type ReactNode } from "react";
import "./modal.css";

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * A native modal dialog (keyboard containment, Escape, focus restored on close). Children only exist while
 * open, so anything inside that holds a resource (a camera stream) lets go of it when the dialog closes.
 */
export function Modal({ open, onClose, label, className = "", children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-label={label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClose={() => { if (open) onClose(); }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
