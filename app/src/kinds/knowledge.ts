import { defineKind, type KindDef } from "@/core/registry";

const label = (kind: string, es: string, en: string, glyph: string, docs: string, extra: Partial<KindDef> = {}) =>
  defineKind({ kind, label: { es, en }, heading: "label", glyph, docs, ...extra });

export default [
  label("concept", "Concepto", "Concept", "◇", "An idea that groups definitions, properties and examples."),
  label("definition", "Definición", "Definition", "≔", "A formal definition, in the staff's own wording and notation."),
  label("property", "Propiedad", "Property", "∴", "A property or characterization."),
  label("remark", "Observación", "Remark", "※", "A remark, warning or common mistake."),
  label("theorem", "Teorema", "Theorem", "⊢", "A theorem. Put its proof in a child `proof` node."),
  label("lemma", "Lema", "Lemma", "⊢", "A lemma (auxiliary result)."),
  label("corollary", "Corolario", "Corollary", "⊢", "A corollary of a previous result."),
  label("formula", "Fórmula", "Formula", "ƒ", "A formula worth memorizing."),
  label("method", "Método", "Method", "→", "A method or procedure to solve a class of problems."),
  label("procedure", "Procedimiento", "Procedure", "→", "A step-by-step procedure."),
  label("example", "Ejemplo", "Example", "e.g.", "A worked example (not a practice exercise)."),
  defineKind({
    kind: "proof",
    label: { es: "Demostración", en: "Proof" },
    heading: "none",
    glyph: "∎",
    docs: "A proof, usually a child of a theorem. No label line: its body is normally one `collapsible` labeled with the proof name.",
  }),
];
