const CONCISE_INSTRUCTION = "Para esta respuesta, sé conciso y andá directo al punto, sin introducciones ni detalles innecesarios.";

/** Expand commands in the reader's question before attaching any quoted course material. */
export function expandMessageCommands(text: string): string {
  if (!/(?:^|\s)-c\s*$/.test(text)) return text;
  const question = text.replace(/(?:^|\s)-c\s*$/, "").trimEnd();
  return question ? `${question}\n\n${CONCISE_INSTRUCTION}` : CONCISE_INSTRUCTION;
}
