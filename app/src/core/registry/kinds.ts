import type { ZodType } from "zod";
import { createRegistry } from "./registry";
import type { ContentIssue, ContentNode } from "../content/types";

export interface KindDef {
  kind: string;
  /** label per course language, e.g. { es: "Definición", en: "Definition" } */
  label: Record<string, string>;
  /** how the node title is drawn on the notebook page */
  heading: "section" | "label" | "none";
  /** short glyph shown in overviews (a single character or emoji-free symbol) */
  glyph: string;
  /** default for `container` when the YAML does not say (containers have no own checkbox state) */
  container?: boolean;
  /** extra YAML fields this kind accepts (e.g. exercise `origin`) */
  fields?: ZodType<Record<string, unknown>>;
  /** kind-specific checks */
  validate?: (node: ContentNode) => Omit<ContentIssue, "file">[];
  docs: string;
}

export const kindRegistry = createRegistry<KindDef>("kinds", (d) => d.kind);

export function defineKind(def: KindDef): KindDef {
  return def;
}

export function kindLabel(kind: string, language: string): string {
  const def = kindRegistry.get(kind);
  if (!def) return kind;
  return def.label[language] ?? def.label.en ?? kind;
}
