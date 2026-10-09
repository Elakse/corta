/**
 * npm run extract -- <file.pdf | folder> [--out <dir>]
 * Extracts text from PDFs page by page (pdf.js, pure JS) into .txt files with "=== page N ===" markers,
 * so the build-course skill can read, search and cite pages. Default output: the course's processed/text/.
 * Never writes into sources/.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const outIdx = args.indexOf("--out");
if (!target) {
  console.error("usage: npm run extract -- <file.pdf | folder> [--out <dir>]");
  process.exit(2);
}
const root = resolve(target);
const files = statSync(root).isDirectory()
  ? (function walk(d: string): string[] {
      return readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : f.toLowerCase().endsWith(".pdf") ? [p] : [];
      });
    })(root)
  : [root];

// default: <course>/processed/text when the input is inside <course>/sources
const defaultOut = () => {
  const i = root.replace(/\\/g, "/").lastIndexOf("/sources");
  return i >= 0 ? join(root.slice(0, i), "processed", "text") : join(dirname(root), "text");
};
const out = outIdx >= 0 ? resolve(args[outIdx + 1]!) : defaultOut();
const base = statSync(root).isDirectory() ? root : dirname(root);

for (const f of files) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(f)), useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    let text = "";
    let lastY: number | null = null;
    for (const it of tc.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
      const y = it.transform[5]!;
      if (lastY !== null && Math.abs(y - lastY) > 2) text += "\n";
      text += it.str;
      if (it.hasEOL) text += "\n";
      lastY = y;
    }
    pages.push(`=== page ${n} ===\n${text.replace(/\n{3,}/g, "\n\n").trim()}`);
  }
  const rel = relative(base, f).replace(/\.pdf$/i, ".txt");
  const dest = join(out, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `# ${basename(f)} (${doc.numPages} pages)\n\n${pages.join("\n\n")}\n`);
  console.log(`${relative(process.cwd(), f)} → ${relative(process.cwd(), dest)} (${doc.numPages} pages)`);
}
