import type { VarValue } from "@/core/content/schemas";
import type { Kit } from "@/graphics-kit";
import type { LiveTokens } from "@/theme";

/** What a canvas module (content/**\/canvas/<name>.tsx) receives. */
export interface CanvasModuleProps {
  vars: Record<string, VarValue>;
  setVar: (name: string, value: VarValue) => void;
  tokens: LiveTokens;
  kit: Kit;
  /** inner size of the card, px */
  width: number;
  height: number;
  /** static props from the YAML */
  props: Record<string, unknown>;
}
