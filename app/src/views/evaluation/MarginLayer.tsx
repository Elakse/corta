import { memo, useEffect, useRef } from "react";
import type { ContentNode } from "@/core/content";
import type { Ruler } from "@/core/ruler";
import { metrics } from "@/theme";
import { useNodeProgress } from "@/state/node-progress";
import { useT } from "@/i18n";
import { usePage } from "./page-context";

interface Slot {
  box: HTMLButtonElement | null;
  bar: HTMLDivElement | null;
}

const Check = memo(function Check({ node, slots }: { node: ContentNode; slots: Map<string, Slot> }) {
  const t = useT();
  const { status, toggle } = useNodeProgress(node.id);
  const slot = slots.get(node.id) ?? { box: null, bar: null };
  slots.set(node.id, slot);
  const label = node.title ?? node.id;
  return (
    <>
      <div className={`bracket${status === "done" ? " on" : ""}`} ref={(el) => void (slot.bar = el)} />
      <button
        type="button"
        role="checkbox"
        className="check"
        data-node-check={node.id}
        data-state={status === "done" ? "on" : status === "partial" ? "partial" : "off"}
        aria-checked={status === "done" ? "true" : status === "partial" ? "mixed" : "false"}
        aria-label={t("check.learned", { title: label })}
        title={label}
        ref={(el) => void (slot.box = el)}
        onClick={toggle}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path className="tick" d="M4.5 10.5 L8.5 14.2 L15.5 5.8" />
          <path className="dash" d="M5.5 10 H14.5" />
        </svg>
      </button>
    </>
  );
});

/**
 * The margin checklist: one checkbox per node, indented by depth, sitting on the node's first baseline
 * (as measured by the ruler), plus a bar running down the node when it's learned.
 * Positions are applied imperatively after every ruler pass (cheap, no re-render).
 */
export function MarginLayer({ nodes, ruler, sheet }: { nodes: ContentNode[]; ruler: Ruler | null; sheet: HTMLElement | null }) {
  const page = usePage();
  const slots = useRef(new Map<string, Slot>()).current;

  useEffect(() => {
    if (!ruler || !sheet) return;
    const place = () => {
      const sr = sheet.getBoundingClientRect();
      const narrow = matchMedia(`(max-width: ${metrics.phone.maxWidth}px)`).matches;
      const cols = narrow ? metrics.checkColumnsPhone : metrics.checkColumns;
      const cb = narrow ? metrics.phone.checkbox : metrics.checkbox;
      const o = ruler.origin();
      for (const n of nodes) {
        const slot = slots.get(n.id);
        const el = page.nodeElement(n.id);
        if (!slot?.box || !slot.bar || !el) continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0) {
          slot.box.style.display = slot.bar.style.display = "none";
          continue;
        }
        slot.box.style.display = slot.bar.style.display = "";
        const first = el.querySelector('[data-rl="text"]');
        const rel = first ? ruler.baselineOf(first) : undefined;
        const base = rel !== undefined ? o + rel : r.top + ruler.unit() - 3;
        const x = cols[Math.min(n.depth, cols.length - 1)]!;
        const top = base - sr.top - cb + 3;
        slot.box.style.left = `${x}px`;
        slot.box.style.top = `${top}px`;
        slot.bar.style.left = `${x}px`;
        slot.bar.style.top = `${top + cb + 5}px`;
        slot.bar.style.height = `${Math.max(0, r.bottom - sr.top - (top + cb + 5))}px`;
      }
    };
    place();
    return ruler.onAligned(place);
  }, [ruler, sheet, nodes, page, slots]);

  return (
    <div className="margin-layer">
      {nodes.map((n) => (
        <Check key={n.id} node={n} slots={slots} />
      ))}
    </div>
  );
}
