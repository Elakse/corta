/** Parser for processed/coverage.md (the build-course skill's audit file). */
export interface Row {
  line: number;
  cells: string[];
}

/** Rows of the first markdown table after a "## Items" heading. */
export function parseItems(md: string): Row[] {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Items\b/i.test(l));
  if (start < 0) return [];
  const rows: Row[] = [];
  let inTable = false;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]!.trim();
    if (/^##\s/.test(l)) break;
    if (!l.startsWith("|")) {
      if (inTable) break;
      continue;
    }
    inTable = true;
    const cells = l.slice(1, l.endsWith("|") ? -1 : undefined).split("|").map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) continue; // separator
    rows.push({ line: i + 1, cells });
  }
  return rows.slice(1); // drop header
}
