import type { PaperType } from "@/core/content";
import { useT } from "@/i18n";
import { Grid2X2, Rows3 } from "lucide-react";

const papers = [{ id: "ruled", Icon: Rows3 }, { id: "grid", Icon: Grid2X2 }] as const;

export function PaperSwitch({ value, onChange }: { value: PaperType; onChange: (p: PaperType) => void }) {
  const t = useT();
  return (
    <fieldset className="theme-choices">
      <legend>{t("paper.label")}</legend>
      {papers.map(({ id, Icon }) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
          <Icon size={20} />{t(`paper.${id}`)}
        </button>
      ))}
    </fieldset>
  );
}
