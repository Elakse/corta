import type { PaperType } from "@/core/content";
import { useT } from "@/i18n";

export function PaperSwitch({ value, onChange }: { value: PaperType; onChange: (p: PaperType) => void }) {
  const t = useT();
  return (
    <div className="paper-switch" role="group" aria-label={t("paper.label")}>
      {(["ruled", "grid"] as const).map((p) => (
        <button key={p} type="button" data-paper={p} aria-pressed={value === p} onClick={() => onChange(p)}>
          {t(p === "ruled" ? "paper.ruled" : "paper.grid")}
        </button>
      ))}
    </div>
  );
}
